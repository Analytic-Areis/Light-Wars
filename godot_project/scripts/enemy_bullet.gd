extends Area2D

@export var speed: float = 230.0
var direction: Vector2 = Vector2.ZERO
var bullet_color: Color = Color("#00F0FF")
var color_id: String = "CYAN"
var lifetime: float = 4.5

func setup(start_pos: Vector2, dir: Vector2, col_name: String) -> void:
	global_position = start_pos
	direction = dir.normalized()
	color_id = col_name
	var c_data = GameManager.COLORS.get(col_name, { "color": Color("#00F0FF") })
	bullet_color = c_data["color"]
	queue_redraw()

func _ready() -> void:
	add_to_group("enemy_bullets")
	z_index = 75
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)

func _physics_process(delta: float) -> void:
	global_position += direction * speed * delta
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()

func _draw() -> void:
	# Standardized glowing chromatic plasma orb for all 6 enemy colors
	draw_circle(Vector2.ZERO, 16.0, Color(bullet_color.r, bullet_color.g, bullet_color.b, 0.35))
	draw_circle(Vector2.ZERO, 10.0, bullet_color)
	draw_circle(Vector2.ZERO, 4.5, Color.WHITE)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		if body.has_method("take_damage"):
			body.take_damage(1, global_position)
		queue_free()
	elif body.is_in_group("obstacles") or body.is_in_group("barrels") or body.is_in_group("walls"):
		if body.has_method("on_hit"):
			body.on_hit(color_id)
		queue_free()

func _on_area_entered(area: Area2D) -> void:
	if area.is_in_group("lasers"):
		# Laser disintegrates enemy bullet!
		queue_free()
