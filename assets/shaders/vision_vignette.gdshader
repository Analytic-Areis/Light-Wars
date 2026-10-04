shader_type canvas_item;

uniform vec2 player_screen_pos = vec2(800.0, 450.0);
uniform float vision_radius = 420.0;
uniform float vision_softness = 160.0;
uniform vec4 darkness_color : source_color = vec4(0.04, 0.05, 0.08, 0.96);

void fragment() {
    float dist = distance(FRAGCOORD.xy, player_screen_pos);
    float alpha = smoothstep(vision_radius, vision_radius + vision_softness, dist);
    COLOR = vec4(darkness_color.rgb, darkness_color.a * alpha);
}
