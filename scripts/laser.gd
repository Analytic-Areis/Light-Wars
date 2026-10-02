extends Area2D

@export var speed: float = 950.0
var direction: Vector2 = Vector2.RIGHT
var color_id: String = "RED"
var lifetime: float = 1.3
var laser_color: Color = Color.RED

func setup(start_pos: Vector2, dir: Vector2, col: String) -> void:
	global_position = start_pos
	direction = dir.normalized()
	color_id = col
	rotation = direction.angle()
	
	if GameManager.COLORS.has(color_id):
		laser_color = GameManager.COLORS[color_id]["color"]
	queue_redraw()

func _ready() -> void:
	add_to_group("lasers")
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)

func _physics_process(delta: float) -> void:
	global_position += direction * speed * delta
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()

func _draw() -> void:
	# Draw glowing 2.5D chromatic laser bolt
	draw_line(Vector2(-24, 0), Vector2(24, 0), Color.WHITE, 4.0)
	draw_line(Vector2(-30, 0), Vector2(30, 0), laser_color, 8.0)
	draw_circle(Vector2(26, 0), 5.0, Color.WHITE)

func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("enemies"):
		if body.has_method("take_laser_hit"):
			body.take_laser_hit(color_id, direction)
		queue_free()
	elif body.is_in_group("obstacles") or body.is_in_group("walls"):
		queue_free()

func _on_area_entered(area: Area2D) -> void:
	if area.is_in_group("orbs"):
		if area.has_method("on_laser_hit"):
			area.on_laser_hit(color_id)
		queue_free()
