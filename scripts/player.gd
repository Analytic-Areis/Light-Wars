extends CharacterBody3D

signal ammo_changed(ammo_dict, active_color)
signal health_changed(current, max_hp)

const SPEED = 7.5
const DASH_SPEED = 18.0
const DASH_DURATION = 0.22
const DASH_COOLDOWN = 1.2

var health: int = 3
var max_health: int = 3
var invuln_timer: float = 0.0

# Ammo inventory
var max_ammo_per_color: int = 6
var ammo: Dictionary = {
	"RED": 6,
	"GREEN": 6,
	"BLUE": 6,
	"CYAN": 0,
	"MAGENTA": 0,
	"YELLOW": 0,
	"WHITE": 0
}
var color_order: Array = ["RED", "GREEN", "BLUE", "CYAN", "MAGENTA", "YELLOW"]
var active_color_idx: int = 0

# Shooting
var shoot_cooldown: float = 0.0
const SHOOT_DELAY = 0.22

# Dash
var is_dashing: bool = false
var dash_timer: float = 0.0
var dash_cooldown_timer: float = 0.0
var dash_dir: Vector3 = Vector3.ZERO

# 8-Direction Sprites
var hero_sprites: Dictionary = {}
var current_dir_name: String = "S"
var aim_world_pos: Vector3 = Vector3.ZERO

@onready var sprite_3d: Sprite3D = $Sprite3D
@onready var muzzle_point: Marker3D = $MuzzlePoint

var laser_scene = preload("res://scenes/laser.tscn")

func _ready() -> void:
	add_to_group("player")
	load_hero_sprites()
	emit_signal("ammo_changed", ammo, get_active_color())
	emit_signal("health_changed", health, max_health)

func load_hero_sprites() -> void:
	var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
	for d in dirs:
		var path = "res://assets/sprites/hero/" + d + ".png"
		if ResourceLoader.exists(path):
			hero_sprites[d] = load(path)
	if hero_sprites.has("S"):
		sprite_3d.texture = hero_sprites["S"]

func get_active_color() -> String:
	return color_order[active_color_idx]

func select_color(idx: int) -> void:
	if idx >= 0 and idx < color_order.size():
		active_color_idx = idx
		emit_signal("ammo_changed", ammo, get_active_color())

func add_ammo(col_id: String, amount: int = 1) -> void:
	if ammo.has(col_id):
		ammo[col_id] = min(max_ammo_per_color, ammo[col_id] + amount)
		emit_signal("ammo_changed", ammo, get_active_color())

func take_damage(amount: int, source_pos: Vector3) -> void:
	if invuln_timer > 0.0 or is_dashing:
		return
	health = max(0, health - amount)
	invuln_timer = 1.0
	emit_signal("health_changed", health, max_health)
	
	# Knockback
	var kb = (global_position - source_pos).normalized() * 4.0
	velocity += Vector3(kb.x, 0, kb.z)
	
	if health <= 0:
		var main_node = get_tree().current_scene
		if main_node and main_node.has_method("on_player_died"):
			main_node.on_player_died()

func _process(delta: float) -> void:
	if shoot_cooldown > 0.0:
		shoot_cooldown -= delta
	if invuln_timer > 0.0:
		invuln_timer -= delta
		sprite_3d.visible = int(Time.get_ticks_msec() / 100) % 2 == 0
	else:
		sprite_3d.visible = true
		
	if dash_cooldown_timer > 0.0:
		dash_cooldown_timer -= delta

	# Number keys for ammo selection
	for i in range(color_order.size()):
		if Input.is_action_just_pressed("ammo_" + str(i + 1)):
			select_color(i)

	# Aiming raycast from camera to floor (Y = 0)
	var camera = get_viewport().get_camera_3d()
	if camera:
		var mouse_pos = get_viewport().get_mouse_position()
		var ray_origin = camera.project_ray_origin(mouse_pos)
		var ray_normal = camera.project_ray_normal(mouse_pos)
		var plane = Plane(Vector3.UP, global_position.y)
		var intersect = plane.intersects_ray(ray_origin, ray_normal)
		if intersect:
			aim_world_pos = intersect
			var aim_vec = Vector2(aim_world_pos.x - global_position.x, aim_world_pos.z - global_position.z)
			var new_dir = GameManager.get_direction_8(aim_vec)
			if new_dir != current_dir_name and hero_sprites.has(new_dir):
				current_dir_name = new_dir
				sprite_3d.texture = hero_sprites[new_dir]

	# Shooting
	if Input.is_action_pressed("shoot") and shoot_cooldown <= 0.0:
		shoot_laser()

	# Dash
	if Input.is_action_just_pressed("dash") and not is_dashing and dash_cooldown_timer <= 0.0:
		trigger_dash()

func shoot_laser() -> void:
	var col_id = get_active_color()
	if ammo[col_id] <= 0:
		return
	
	ammo[col_id] -= 1
	shoot_cooldown = SHOOT_DELAY
	emit_signal("ammo_changed", ammo, col_id)
	
	var dir = (aim_world_pos - global_position)
	dir.y = 0.0
	dir = dir.normalized()
	
	var laser = laser_scene.instantiate()
	var spawn_pos = global_position + Vector3(0, 0.8, 0) + dir * 0.8
	get_parent().add_child(laser)
	laser.init_laser(spawn_pos, dir, col_id, true)

func trigger_dash() -> void:
	is_dashing = true
	dash_timer = DASH_DURATION
	dash_cooldown_timer = DASH_COOLDOWN
	
	var input_vec = Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if input_vec.length_squared() > 0.01:
		dash_dir = Vector3(input_vec.x, 0, input_vec.y).normalized()
	else:
		var dir = (aim_world_pos - global_position)
		dir.y = 0
		dash_dir = dir.normalized()

func _physics_process(delta: float) -> void:
	if is_dashing:
		dash_timer -= delta
		velocity = dash_dir * DASH_SPEED
		if dash_timer <= 0.0:
			is_dashing = false
	else:
		var input_vec = Input.get_vector("move_left", "move_right", "move_up", "move_down")
		var target_vel = Vector3(input_vec.x, 0, input_vec.y).normalized() * SPEED
		velocity.x = move_toward(velocity.x, target_vel.x, SPEED * 8.0 * delta)
		velocity.z = move_toward(velocity.z, target_vel.z, SPEED * 8.0 * delta)
	
	move_and_slide()
