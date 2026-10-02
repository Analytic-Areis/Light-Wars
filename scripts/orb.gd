extends Area2D

@export var color_id: String = "RED"
var orb_color: Color = Color.RED
var float_time: float = 0.0
var pulse_time: float = 0.0
var sparkles: Array = []

@onready var label: Label = $Label

func _ready() -> void:
	add_to_group("orbs")
	set_orb_color(color_id)
	# NOTE: Hero must NOT collect the red orb or other orbs on contact!
	# Orbs in Light-Wars are ammunition crafting targets shot with lasers.

func set_orb_color(col: String) -> void:
	color_id = col
	if GameManager.COLORS.has(color_id):
		orb_color = GameManager.COLORS[color_id]["color"]
	if label:
		label.text = color_id.left(1)
		label.modulate = Color.WHITE
	queue_redraw()

func _process(delta: float) -> void:
	float_time += delta * 3.5
	pulse_time += delta * 4.0
	
	# Periodically spawn orbiting sparkles around the orb
	if sparkles.size() < 8 and randf() < 0.28:
		sparkles.append({
			"angle": randf() * TAU,
			"dist": randf_range(24.0, 36.0),
			"speed": (1.0 if randf() > 0.5 else -1.0) * randf_range(2.0, 3.5),
			"life": 0.7,
			"max_life": 0.7,
			"size": randf_range(2.0, 3.5)
		})
		
	# Update active sparkles
	for i in range(sparkles.size() - 1, -1, -1):
		var sp = sparkles[i]
		sp["angle"] += sp["speed"] * delta
		sp["life"] -= delta
		if sp["life"] <= 0.0:
			sparkles.remove_at(i)
			
	# Keep label bobbing in sync with the glowing orb
	if label:
		var bob = sin(float_time) * 7.0
		label.position.y = -43.0 + bob
		
	queue_redraw()

func _draw() -> void:
	var bob = sin(float_time) * 7.0
	var center = Vector2(0, -30 + bob)
	var pulse = 1.0 + sin(pulse_time) * 0.12
	
	# 1. 2.5D Isometric Ground Shadow on the floor
	var shadow_points = PackedVector2Array()
	var shadow_center = Vector2(0, 4)
	var rx = 24.0
	var ry = 10.0
	for i in range(16):
		var a = (float(i) / 16.0) * TAU
		shadow_points.append(shadow_center + Vector2(cos(a) * rx, sin(a) * ry))
	draw_colored_polygon(shadow_points, Color(0, 0, 0, 0.42))
	
	# 2. Multi-layer Radiant Glow Aura (Intense chromatic outer corona)
	draw_circle(center, 44.0 * pulse, Color(orb_color.r, orb_color.g, orb_color.b, 0.10))
	draw_circle(center, 34.0 * pulse, Color(orb_color.r, orb_color.g, orb_color.b, 0.22))
	draw_circle(center, 25.0 * pulse, Color(orb_color.r, orb_color.g, orb_color.b, 0.42))
	
	# 3. Orbiting Sparkles in 2.5D Isometric Tilt
	for sp in sparkles:
		var sx = center.x + cos(sp["angle"]) * sp["dist"]
		var sy = center.y + sin(sp["angle"]) * (sp["dist"] * 0.58)
		var alpha = clamp(sp["life"] / sp["max_life"], 0.0, 1.0)
		draw_circle(Vector2(sx, sy), sp["size"], Color(1.0, 1.0, 1.0, alpha * 0.95))
		draw_circle(Vector2(sx, sy), sp["size"] * 1.8, Color(orb_color.r, orb_color.g, orb_color.b, alpha * 0.5))

	# 4. 3D Spherical Orb Body
	var r = 18.0 * pulse
	# Dark shadow edge
	draw_circle(center, r + 1.2, Color(orb_color.r * 0.3, orb_color.g * 0.3, orb_color.b * 0.3, 0.95))
	# Main chromatic body
	draw_circle(center, r, orb_color)
	# Inner glowing spherical volume offset towards top-left
	draw_circle(center + Vector2(-3, -3), r * 0.70, Color(lerp(orb_color.r, 1.0, 0.45), lerp(orb_color.g, 1.0, 0.45), lerp(orb_color.b, 1.0, 0.45), 0.85))
	# Specular hot highlight
	draw_circle(center + Vector2(-6, -6), r * 0.28, Color(1.0, 1.0, 1.0, 0.95))
	# High-tech comic outline
	draw_arc(center, r, 0, TAU, 32, Color(1.0, 1.0, 1.0, 0.95), 2.2, true)

func on_laser_hit(laser_col: String) -> void:
	var combo = color_id + "_" + laser_col
	var result_color = GameManager.ORB_CONVERSIONS.get(combo, "")
	var main = get_tree().current_scene
	var player = get_tree().get_first_node_in_group("player")
	
	if result_color != "":
		# Successful conversion!
		if player and player.ammo.has(result_color):
			player.ammo[result_color] = min(player.max_ammo_per_color, player.ammo[result_color] + 3)
			player.emit_signal("ammo_changed", player.ammo, player.get_active_color())
			
		if main and main.has_method("spawn_comic_floater"):
			var res_data = GameManager.COLORS.get(result_color, { "color": Color.WHITE })
			main.spawn_comic_floater(global_position + Vector2(0, -60), "CRAFTED " + result_color + "!", res_data["color"])
		if main and main.has_method("on_orb_converted"):
			main.on_orb_converted(color_id, laser_col, result_color)
		
		queue_free()
	else:
		# Wrong laser combination: deflects and stays alive
		if main and main.has_method("spawn_comic_floater"):
			main.spawn_comic_floater(global_position + Vector2(0, -60), "DEFLECT!", Color.WHITE)
