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
