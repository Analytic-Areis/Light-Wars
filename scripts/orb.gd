extends Area2D

@export var color_id: String = "RED"
var orb_color: Color = Color.RED
var float_time: float = 0.0

func _ready() -> void:
	add_to_group("orbs")
	set_orb_color(color_id)
	body_entered.connect(_on_body_entered)

func set_orb_color(col: String) -> void:
	color_id = col
	if GameManager.COLORS.has(color_id):
		orb_color = GameManager.COLORS[color_id]["color"]
	queue_redraw()

func _process(delta: float) -> void:
	float_time += delta * 4.0
	queue_redraw()

func _draw() -> void:
	var bob = sin(float_time) * 6.0
	var center = Vector2(0, -30 + bob)
	# Glowing chromatic orb
	draw_circle(center, 22.0, Color(orb_color.r, orb_color.g, orb_color.b, 0.35))
	draw_circle(center, 15.0, orb_color)
	draw_circle(center + Vector2(-4, -4), 5.0, Color.WHITE)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		# Player collects orb directly: +2 ammo of this orb color
		if body.ammo.has(color_id):
			body.ammo[color_id] = min(body.max_ammo_per_color, body.ammo[color_id] + 2)
			body.emit_signal("ammo_changed", body.ammo, body.get_active_color())
			
		var main = get_parent()
		if main and main.has_method("spawn_comic_floater"):
			main.spawn_comic_floater(global_position + Vector2(0, -50), "+2 " + color_id + " AMMO!", orb_color)
		queue_free()

func on_laser_hit(laser_col: String) -> void:
	var combo = color_id + "_" + laser_col
	var result_color = GameManager.ORB_CONVERSIONS.get(combo, "")
	var main = get_parent()
	var player = get_tree().get_first_node_in_group("player")
	
	if result_color != "":
		if player and player.ammo.has(result_color):
			player.ammo[result_color] = min(player.max_ammo_per_color, player.ammo[result_color] + 3)
			player.emit_signal("ammo_changed", player.ammo, player.get_active_color())
			
		if main and main.has_method("spawn_comic_floater"):
			var res_data = GameManager.COLORS.get(result_color, { "color": Color.WHITE })
			main.spawn_comic_floater(global_position + Vector2(0, -60), "CRAFTED " + result_color + "!", res_data["color"])
		if main and main.has_method("on_orb_converted"):
			main.on_orb_converted(color_id, laser_col, result_color)
	else:
		if main and main.has_method("spawn_comic_floater"):
			main.spawn_comic_floater(global_position + Vector2(0, -60), "NO REACTION", Color.GRAY)
			
	queue_free()
