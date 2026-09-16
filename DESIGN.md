# Collective AI campus explorer

Purpose: explore the complete 35-facility, 220-acre vision, select any facility and optionally tour its floor programs. Success requires visible reference agreement on desktop and mobile plus working tours, not a reference image used as scenery.

Direction: architectural visitor atlas. Navy #050A18 shell, ivory #F5F5F5 text, gold #D4A843 actions and teal #00D9B5 network status. Warm illuminated interiors, graphite framing, blue glass, dense green/pink landscape and connected water gardens. No stock dashboard, particles, glass UI, or art billboards in the 3D scene.

Typography: system sans (Inter-compatible), 12px metadata, 14px controls, 26px facility title, 36px desktop title; 1.45 line-height. Locally rendered, no font CDN.

Layout: full-viewport scene, compact header, collapsible 288px directory left, 300px facility panel right, bottom view controls. Spacing 8/12/16/24px. 1px slate borders, 6px radius, opaque panels. Desktop keeps center open. At 760px and below directory and detail become mutually exclusive bottom sheets capped at 55dvh, 44px minimum targets, safe-area padding. Controls wrap without horizontal overflow.

Components: facility search and district filter, directory buttons CF-01–35, selected detail, enter tour, floor selector, room stop list, touch movement pad, return to campus, layers toggles, aerial/ground camera and daylight controls. Use native semantic controls rather than an unrelated component library.

States: visible gold focus ring, teal selected state, disabled controls while transitioning, concise loading state, actionable renderer failure with retry; no infinite splash. Selection announces facility. Escape closes sheets/exits tours. Reduced motion disables auto flight and fleet animation; movement remains user controlled.

Motion: anime.js camera and panel easing 900ms (0 for reduced motion); delta-time fleet motion on defined paths. Three.js exterior; lazy Babylon.js interior engine only on entry, dispose on return. Shared instancing and bounded pixel ratio for mobile. Reference/cutaway interiors cannot reveal all hidden detail: implemented furnishing is an interpretation of the schematic programs.

Validation: all 35 IDs and 74 levels, no blank program, geometry finite, build succeeds, facility click/tour/floor/return, search, keyboard, narrow viewport and screenshot comparison. Physical Galaxy A15 performance is a separate device gate.

## Capability failure and schematic plans
Bind facility browsing before GPU startup. A failed WebGL context opens a clearly labelled schematic campus map with the same 35 selectable facilities. Never label this a 3D tour. Keep the directory, source areas and floor programs available. Add a separate floor-plan modal for all browsers, with true schematic bay proportions, two support cores, a 12-foot corridor and six accessible room buttons. The plan can be opened alongside the optional 3D tour on capable devices. On narrow screens the plan stacks below its header and above the room list; modal focus returns to its initiating action.

## September 16 reference priority and tour refinement
User-selected precedence: aerial artwork determines placement; individual CF infographics determine architecture and visible interiors. Hidden rooms receive realistic inferred furnishings. Preserve all 35 facilities / 74 programs and the CF-24/25 area caveat. Tour geometry uses detailed joinery, upholstered task seating, equipment and warm architectural lighting; no source artwork as scenery. Collapse room navigation during exploration and suppress the marketing caption once the user interacts. Desktop and mobile use selectable balanced/high rendering resolution with explicit on-device measurement, not assumed hardware capabilities.
