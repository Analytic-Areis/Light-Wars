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
	z_index = 80
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)

func _physics_process(delta: float) -> void:
	global_position += direction * speed * delta
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()

func _draw() -> void:
	# 1. Multi-layered intense radial bloom aura (identical to the glowing Orb style)
	draw_line(Vector2(-38, 0), Vector2(34, 0), Color(laser_color.r, laser_color.g, laser_color.b, 0.14), 36.0)
	draw_line(Vector2(-34, 0), Vector2(32, 0), Color(laser_color.r, laser_color.g, laser_color.b, 0.32), 24.0)
	draw_line(Vector2(-30, 0), Vector2(30, 0), Color(laser_color.r, laser_color.g, laser_color.b, 0.75), 14.0)
	draw_line(Vector2(-26, 0), Vector2(28, 0), laser_color, 8.0)
	# White-hot plasma core filament
	draw_line(Vector2(-22, 0), Vector2(24, 0), Color.WHITE, 4.0)
	
	# 2. Glowing leading projectile orb tip
	draw_circle(Vector2(28, 0), 16.0, Color(laser_color.r, laser_color.g, laser_color.b, 0.35))
	draw_circle(Vector2(28, 0), 10.0, laser_color)
	draw_circle(Vector2(28, 0), 5.0, Color.WHITE)
	
	# 3. Trailing energy sparks
	draw_circle(Vector2(-24, 0), 6.0, Color(laser_color.r, laser_color.g, laser_color.b, 0.5))
	draw_circle(Vector2(-36, 0), 3.5, Color(laser_color.r, laser_color.g, laser_color.b, 0.3))

func _on_body_entered(body: Node2D) -> void:
	set_deferred("monitoring", false)
	set_deferred("monitorable", false)
	if body.is_in_group("enemies"):
		if body.has_method("take_laser_hit"):
			body.take_laser_hit(color_id, direction)
	call_deferred("queue_free")

func _on_area_entered(area: Area2D) -> void:
	set_deferred("monitoring", false)
	set_deferred("monitorable", false)
	if area.is_in_group("orbs"):
		if area.has_method("on_laser_hit"):
			area.on_laser_hit(color_id)
	call_deferred("queue_free")
