extends CharacterBody2D

signal health_changed(current: int, max_hp: int)
signal ammo_changed(ammo_dict: Dictionary, active_col: String)

@export var speed: float = 320.0
@export var dash_speed: float = 750.0

var max_health: int = 3
var health: int = 3

var max_ammo_per_color: int = 6
var ammo: Dictionary = {
	"RED": 6,
	"GREEN": 6,
	"BLUE": 6,
	"CYAN": 0,
	"MAGENTA": 0,
	"YELLOW": 0
}
var color_order: Array = ["RED", "GREEN", "BLUE", "CYAN", "MAGENTA", "YELLOW"]
var active_color_idx: int = 0

var is_dashing: bool = false
var dash_timer: float = 0.0
var dash_cooldown: float = 0.0
var dash_dir: Vector2 = Vector2.ZERO

var shoot_cooldown: float = 0.0
var walk_anim_time: float = 0.0
var idle_anim_time: float = 0.0
var current_dir: String = "S"

# Cached sprites: dir -> { "idle": [tex0..tex3], "run": [tex0..tex7] }
var character_sprites: Dictionary = {}

@onready var sprite_2d: Sprite2D = $Sprite2D
var laser_scene = preload("res://scenes/laser.tscn")

func _ready() -> void:
	add_to_group("player")
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING
	load_hero_sprites()
	update_sprite(true)
	emit_signal("health_changed", health, max_health)
	emit_signal("ammo_changed", ammo, get_active_color())

func load_hero_sprites() -> void:
	character_sprites.clear()
	var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
	for d in dirs:
		character_sprites[d] = { "idle": [], "run": [] }
		
		# Load idle frames from new_girl (up to 20)
		for i in range(20):
			var idle_path = "res://assets/sprites/hero/" + d + "_idle_" + str(i) + ".png"
			if ResourceLoader.exists(idle_path):
				character_sprites[d]["idle"].append(load(idle_path))
		if character_sprites[d]["idle"].is_empty():
			var fallback_idle = "res://assets/sprites/hero/" + d + "_idle.png"
			if ResourceLoader.exists(fallback_idle):
				character_sprites[d]["idle"].append(load(fallback_idle))
			
		# Load run frames from new_girl (up to 20)
		for r in range(20):
			var r_path = "res://assets/sprites/hero/" + d + "_run_" + str(r) + ".png"
			if ResourceLoader.exists(r_path):
				character_sprites[d]["run"].append(load(r_path))

func get_active_color() -> String:
	return color_order[active_color_idx]

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1: select_color(0)
			KEY_2: select_color(1)
			KEY_3: select_color(2)
			KEY_4: select_color(3)
			KEY_5: select_color(4)
			KEY_6: select_color(5)
			KEY_SPACE: request_dash()
	elif event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_WHEEL_UP:
			select_prev_color()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			select_next_color()
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			request_dash()

func select_color(idx: int) -> void:
	if idx >= 0 and idx < color_order.size():
		active_color_idx = idx
		emit_signal("ammo_changed", ammo, get_active_color())

func select_next_color() -> void:
	active_color_idx = (active_color_idx + 1) % color_order.size()
	emit_signal("ammo_changed", ammo, get_active_color())

func select_prev_color() -> void:
	active_color_idx = (active_color_idx - 1 + color_order.size()) % color_order.size()
	emit_signal("ammo_changed", ammo, get_active_color())

func request_dash() -> void:
	if dash_cooldown <= 0.0 and not is_dashing:
		var input_vec = Input.get_vector("move_left", "move_right", "move_up", "move_down")
		if input_vec.length_squared() > 0.01:
			var iso_dir = Vector2(input_vec.x - input_vec.y, input_vec.x + input_vec.y).normalized()
			dash_dir = iso_dir
		else:
			dash_dir = (get_global_mouse_position() - global_position).normalized()
		is_dashing = true
		dash_timer = 0.22
		dash_cooldown = 1.2
		var main = get_tree().current_scene
		if main and main.has_method("play_sfx") and "sfx_dash" in main:
			main.play_sfx(main.sfx_dash, randf_range(0.95, 1.05))

func _physics_process(delta: float) -> void:
	if shoot_cooldown > 0.0:
		shoot_cooldown -= delta
	if dash_cooldown > 0.0:
		dash_cooldown -= delta

	# Aim direction for shooting
	var mouse_pos = get_global_mouse_position()
	var to_mouse = (mouse_pos - global_position).normalized()

	# Movement
	if is_dashing:
		dash_timer -= delta
		velocity = dash_dir * dash_speed
		if dash_timer <= 0.0:
			is_dashing = false
	else:
		var input_vec = Input.get_vector("move_left", "move_right", "move_up", "move_down")
		if input_vec.length_squared() > 0.01:
			# Isometric 45-degree conversion:
			# When pressing W, character moves Up-Right (isometric North, exactly what W+D did)
			# When pressing S, character moves Down-Left (isometric South)
			# When pressing D, character moves Down-Right (isometric East)
			# When pressing A, character moves Up-Left (isometric West)
			var iso_dir = Vector2(input_vec.x - input_vec.y, input_vec.x + input_vec.y).normalized()
			current_dir = GameManager.get_direction_8(iso_dir)
			velocity = iso_dir * speed
			walk_anim_time += delta * 11.0
			idle_anim_time = 0.0
			update_sprite(false)
		else:
			velocity = Vector2.ZERO
			walk_anim_time = 0.0
			idle_anim_time += delta * 8.0
			update_sprite(true)

	move_and_slide()

	# Shooting fires towards mouse cursor
	if Input.is_action_pressed("shoot") and shoot_cooldown <= 0.0:
		try_shoot(to_mouse)

func update_sprite(is_idle: bool) -> void:
	if not sprite_2d or not character_sprites.has(current_dir):
		return
		
	var dir_data = character_sprites[current_dir]
	if is_idle:
		var idle_frames = dir_data["idle"]
		if not idle_frames.is_empty():
			var f_idx = int(idle_anim_time) % idle_frames.size()
			sprite_2d.texture = idle_frames[f_idx]
	else:
		var run_frames = dir_data["run"]
		if not run_frames.is_empty():
			var f_idx = int(walk_anim_time) % run_frames.size()
			sprite_2d.texture = run_frames[f_idx]

func try_shoot(aim_dir: Vector2) -> void:
	var active_col = get_active_color()
	if ammo[active_col] <= 0:
		return
		
	ammo[active_col] -= 1
	shoot_cooldown = 0.20
	emit_signal("ammo_changed", ammo, active_col)
	
	# Small muzzle kick recoil
	velocity -= aim_dir * 50.0
	
	var laser = laser_scene.instantiate()
	get_parent().add_child(laser)
	laser.setup(global_position + aim_dir * 28.0, aim_dir, active_col)
	
	var main = get_tree().current_scene
	if main and main.has_method("play_sfx") and "sfx_laser" in main:
		main.play_sfx(main.sfx_laser, randf_range(0.95, 1.05))

func take_damage(amount: int, from_pos: Vector2) -> void:
	if is_dashing or health <= 0:
		return
		
	health = max(0, health - amount)
	emit_signal("health_changed", health, max_health)
	
	# Knockback
	var knock_dir = (global_position - from_pos).normalized()
	velocity = knock_dir * 380.0
	
	var main = get_tree().current_scene
	if main and main.has_method("add_camera_shake"):
		main.add_camera_shake(0.5)
	
	if sprite_2d:
		sprite_2d.modulate = Color.RED
		get_tree().create_timer(0.15).timeout.connect(func(): if sprite_2d: sprite_2d.modulate = Color.WHITE)
		
	if health <= 0:
		if main and main.has_method("on_player_died"):
			main.on_player_died()
