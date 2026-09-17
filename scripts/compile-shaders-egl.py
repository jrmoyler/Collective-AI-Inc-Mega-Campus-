"""Compile/link unchanged GLSL with native surfaceless EGL, without a browser.
Requires system libEGL + Mesa. Software Mesa is explicitly selected by default.
Usage: python scripts/compile-shaders-egl.py shader.vert shader.frag
"""
import ctypes as c
import json
import os
import sys

os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE', '1')
egl_library = c.CDLL('libEGL.so.1')
PTR, INT, UINT = c.c_void_p, c.c_int, c.c_uint


def egl_function(name, result, arguments):
    function = getattr(egl_library, name)
    function.restype, function.argtypes = result, arguments
    return function


get_proc = egl_function('eglGetProcAddress', PTR, [c.c_char_p])


def function(name, result, arguments):
    address = get_proc(name.encode())
    if not address:
        raise RuntimeError(f'Unavailable native function: {name}')
    return c.CFUNCTYPE(result, *arguments)(address)


get_display = function('eglGetPlatformDisplayEXT', PTR, [UINT, PTR, c.POINTER(INT)])
display = get_display(0x31DD, None, None)  # EGL_PLATFORM_SURFACELESS_MESA
major, minor = INT(), INT()
if not egl_function('eglInitialize', UINT, [PTR, c.POINTER(INT), c.POINTER(INT)])(display, c.byref(major), c.byref(minor)):
    raise RuntimeError('Native surfaceless EGL initialization failed')
if not egl_function('eglBindAPI', UINT, [UINT])(0x30A0):  # EGL_OPENGL_ES_API
    raise RuntimeError('OpenGL ES API unavailable')
attributes = (INT * 9)(0x3040, 0x40, 0x3033, 1, 0x3024, 8, 0x3023, 8, 0x3038)
config, count = PTR(), INT()
choose = egl_function('eglChooseConfig', UINT, [PTR, c.POINTER(INT), c.POINTER(PTR), INT, c.POINTER(INT)])
if not choose(display, attributes, c.byref(config), 1, c.byref(count)) or not count.value:
    raise RuntimeError('OpenGL ES 3 EGL configuration unavailable')
context = egl_function('eglCreateContext', PTR, [PTR, PTR, PTR, c.POINTER(INT)])(display, config, None, (INT * 3)(0x3098, 3, 0x3038))
if not context or not egl_function('eglMakeCurrent', UINT, [PTR, PTR, PTR, PTR])(display, None, None, context):
    raise RuntimeError('Native OpenGL ES context creation failed')

get_string = function('glGetString', c.c_char_p, [UINT])
result = {'api': get_string(0x1F02).decode(), 'renderer': get_string(0x1F01).decode(), 'stages': []}
if '--version' in sys.argv:
    print(json.dumps(result))
    sys.exit(0)

if '--framebuffers' in sys.argv:
    get_integer = function('glGetIntegerv', None, [UINT, c.POINTER(INT)])
    get_internal = function('glGetInternalformativ', None, [UINT, UINT, UINT, INT, c.POINTER(INT)])
    get_error = function('glGetError', UINT, [])
    maximum = INT()
    get_integer(0x8D57, c.byref(maximum))  # GL_MAX_SAMPLES

    def sample_counts(internal_format):
        count = INT()
        get_internal(0x8D41, internal_format, 0x9380, 1, c.byref(count))
        values = (INT * count.value)()
        get_internal(0x8D41, internal_format, 0x80A9, count.value, values)
        return list(values)

    def allocate(kind):
        value = UINT()
        function('glGen' + kind, None, [INT, c.POINTER(UINT)])(1, c.byref(value))
        return value.value

    def errors():
        found = []
        for _ in range(16):
            error = get_error()
            if not error:
                break
            found.append(hex(error))
        return found

    bind_fbo = function('glBindFramebuffer', None, [UINT, UINT])
    check_fbo = function('glCheckFramebufferStatus', UINT, [UINT])
    bind_rbo = function('glBindRenderbuffer', None, [UINT, UINT])
    storage_ms = function('glRenderbufferStorageMultisample', None, [UINT, INT, UINT, INT, INT])
    storage = function('glRenderbufferStorage', None, [UINT, UINT, INT, INT])
    attach_rbo = function('glFramebufferRenderbuffer', None, [UINT, UINT, UINT, UINT])
    result.update({'maxSamples': maximum.value, 'rgba16fSampleCounts': sample_counts(0x881A), 'depth24SampleCounts': sample_counts(0x81A6), 'framebuffers': []})
    common = set(result['rgba16fSampleCounts']) & set(result['depth24SampleCounts'])
    chosen = max([value for value in common if value <= min(4, maximum.value)] or [0])
    result['chosenSamples'] = chosen
    # No attachments is a known-incomplete negative control.
    missing = allocate('Framebuffers')
    bind_fbo(0x8D40, missing)
    result['incompleteNegativeControl'] = hex(check_fbo(0x8D40))
    failed = result['incompleteNegativeControl'] == hex(0x8CD5)
    resolved = allocate('Framebuffers')
    bind_fbo(0x8D40, resolved)
    texture = allocate('Textures')
    function('glBindTexture', None, [UINT, UINT])(0x0DE1, texture)
    function('glTexImage2D', None, [UINT, INT, INT, INT, INT, INT, UINT, UINT, PTR])(0x0DE1, 0, 0x881A, 128, 128, 0, 0x1908, 0x140B, None)
    function('glFramebufferTexture2D', None, [UINT, UINT, UINT, UINT, INT])(0x8D40, 0x8CE0, 0x0DE1, texture, 0)
    depth = allocate('Renderbuffers')
    bind_rbo(0x8D41, depth)
    storage(0x8D41, 0x81A6, 128, 128)
    attach_rbo(0x8D40, 0x8D00, 0x8D41, depth)
    status = check_fbo(0x8D40)
    result['framebuffers'].append({'name': 'rgba16f-texture-depth24', 'status': hex(status), 'errors': errors()})
    failed |= status != 0x8CD5
    draw = resolved
    if chosen:
        draw = allocate('Framebuffers')
        bind_fbo(0x8D40, draw)
        for attachment, internal_format in [(0x8CE0, 0x881A), (0x8D00, 0x81A6)]:
            buffer = allocate('Renderbuffers')
            bind_rbo(0x8D41, buffer)
            storage_ms(0x8D41, chosen, internal_format, 128, 128)
            attach_rbo(0x8D40, attachment, 0x8D41, buffer)
        status = check_fbo(0x8D40)
        result['framebuffers'].append({'name': 'rgba16f-msaa-depth24', 'samples': chosen, 'status': hex(status), 'errors': errors()})
        failed |= status != 0x8CD5
    function('glClearColor', None, [c.c_float] * 4)(.25, .5, .75, 1)
    function('glClear', None, [UINT])(0x4000 | 0x0100)
    if chosen:
        bind_fbo(0x8CA8, draw)  # READ_FRAMEBUFFER
        bind_fbo(0x8CA9, resolved)  # DRAW_FRAMEBUFFER
        function('glBlitFramebuffer', None, [INT] * 8 + [UINT, UINT])(0, 0, 128, 128, 0, 0, 128, 128, 0x4000, 0x2600)
    bind_fbo(0x8D40, resolved)
    pixel = (c.c_float * 4)()
    function('glReadPixels', None, [INT, INT, INT, INT, UINT, UINT, PTR])(64, 64, 1, 1, 0x1908, 0x1406, pixel)
    result['readback'] = list(pixel)
    result['errors'] = errors()
    result['passed'] = not failed and not result['errors'] and all(not target['errors'] for target in result['framebuffers']) and all(abs(actual - expected) < .005 for actual, expected in zip(pixel, [.25, .5, .75, 1]))
    print(json.dumps(result))
    sys.exit(0 if result['passed'] else 1)

create_shader = function('glCreateShader', UINT, [UINT])
set_source = function('glShaderSource', None, [UINT, INT, c.POINTER(c.c_char_p), c.POINTER(INT)])
compile_shader = function('glCompileShader', None, [UINT])
get_shader = function('glGetShaderiv', None, [UINT, UINT, c.POINTER(INT)])
shader_log = function('glGetShaderInfoLog', None, [UINT, INT, c.POINTER(INT), c.c_char_p])
program = function('glCreateProgram', UINT, [])()
attach_shader = function('glAttachShader', None, [UINT, UINT])
failed = False
for filename in sys.argv[1:]:
    stage = 'vertex' if filename.endswith('.vert') else 'fragment'
    shader = create_shader(0x8B31 if stage == 'vertex' else 0x8B30)
    with open(filename, 'rb') as stream:
        source = c.c_char_p(stream.read())
    set_source(shader, 1, c.byref(source), None)
    compile_shader(shader)
    passed, log = INT(), c.create_string_buffer(32768)
    get_shader(shader, 0x8B81, c.byref(passed))  # GL_COMPILE_STATUS
    shader_log(shader, len(log), None, log)
    result['stages'].append({'stage': stage, 'passed': bool(passed.value), 'log': log.value.decode()})
    failed |= not bool(passed.value)
    attach_shader(program, shader)

function('glLinkProgram', None, [UINT])(program)
passed, log = INT(), c.create_string_buffer(32768)
function('glGetProgramiv', None, [UINT, UINT, c.POINTER(INT)])(program, 0x8B82, c.byref(passed))
function('glGetProgramInfoLog', None, [UINT, INT, c.POINTER(INT), c.c_char_p])(program, len(log), None, log)
result['link'] = {'passed': bool(passed.value), 'log': log.value.decode()}
failed |= not bool(passed.value)
print(json.dumps(result))
egl_function('eglMakeCurrent', UINT, [PTR, PTR, PTR, PTR])(display, None, None, None)
egl_function('eglDestroyContext', UINT, [PTR, PTR])(display, context)
egl_function('eglTerminate', UINT, [PTR])(display)
sys.exit(1 if failed else 0)
