extends Area2D

@export var color_id: String = "YELLOW"
var pickup_color: Color = Color.YELLOW
var float_time: float = 0.0
var pulse_time: float = 0.0
var is_collected: bool = false

@onready var label: Label = $Label
@onready var col_shape: CollisionShape2D = $CollisionShape2D

func _ready() -> void:
	add_to_group("ammo_pickups")
	z_index = 60
	setup(color_id)
	body_entered.connect(_on_body_entered)

func setup(col_name: String) -> void:
	color_id = col_name
	var c_data = GameManager.COLORS.get(col_name, { "color": Color.YELLOW })
	pickup_color = c_data["color"]
	if label:
		label.text = "+1 " + color_id.left(1)
		label.modulate = pickup_color
	queue_redraw()

func _process(delta: float) -> void:
	float_time += delta * 4.0
	pulse_time += delta * 5.0
	if label:
		var bob = sin(float_time) * 5.0
		label.position.y = -35.0 + bob
	queue_redraw()

func _draw() -> void:
	var bob = sin(float_time) * 5.0
	var center = Vector2(0, -18 + bob)
	var pulse = 1.0 + sin(pulse_time) * 0.15
	
	# 1. Ground contact shadow
	draw_circle(Vector2(0, 4), 18.0, Color(0, 0, 0, 0.45))
	
	# 2. Glowing outer bloom corona
	draw_circle(center, 30.0 * pulse, Color(pickup_color.r, pickup_color.g, pickup_color.b, 0.15))
	draw_circle(center, 20.0 * pulse, Color(pickup_color.r, pickup_color.g, pickup_color.b, 0.35))
	
	# 3. Crystal diamond projectile ammo icon
	var r = 12.0
	var diamond = PackedVector2Array([
		center + Vector2(0, -r * 1.3),
		center + Vector2(r, 0),
		center + Vector2(0, r * 1.3),
		center + Vector2(-r, 0)
	])
	draw_colored_polygon(diamond, pickup_color)
	
	# Core white energy filament
	var inner_diamond = PackedVector2Array([
		center + Vector2(0, -r * 0.7),
		center + Vector2(r * 0.5, 0),
		center + Vector2(0, r * 0.7),
		center + Vector2(-r * 0.5, 0)
	])
	draw_colored_polygon(inner_diamond, Color.WHITE)
	
	# High-tech outline
	draw_polyline(diamond, Color.WHITE, 1.8)

func _on_body_entered(body: Node2D) -> void:
	if is_collected: return
	if body.is_in_group("player"):
		is_collected = true
		if body.ammo.has(color_id):
			body.ammo[color_id] = min(body.max_ammo_per_color, body.ammo[color_id] + 1)
			body.emit_signal("ammo_changed", body.ammo, body.get_active_color())
			
		var main = get_tree().current_scene
		if main and main.has_method("spawn_comic_floater"):
			main.spawn_comic_floater(global_position + Vector2(0, -60), "+1 " + color_id + "!", pickup_color)
		if main and main.has_method("play_sfx"):
			if main.get("sfx_craft"):
				main.play_sfx(main.sfx_craft, 1.25)
				
		queue_free()
