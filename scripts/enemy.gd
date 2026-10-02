extends CharacterBody3D

@export var color_id: String = "CYAN"
var speed: float = 3.8
var health: int = 1
var attack_cooldown: float = 0.0

var troop_sprites: Dictionary = {}
var run_frames: Array[Texture2D] = []
var current_dir_name: String = "S"

# Animation
var base_sprite_y: float = 1.45
var walk_anim_time: float = 0.0
var hurt_flash_timer: float = 0.0
var knockback_vel: Vector3 = Vector3.ZERO

@onready var sprite_3d: Sprite3D = $Sprite3D
var orb_scene = preload("res://scenes/orb.tscn")

func _ready() -> void:
	add_to_group("enemies")
	load_sprites_for_color()

func set_enemy_color(new_col: String) -> void:
	color_id = new_col
	load_sprites_for_color()

func load_sprites_for_color() -> void:
	troop_sprites.clear()
	run_frames.clear()
	var folder = "troop_" + color_id.to_lower()
	var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
	for d in dirs:
		var path = "res://assets/sprites/" + folder + "/" + d + ".png"
		if ResourceLoader.exists(path):
			troop_sprites[d] = load(path)
			
	# Load the 8 running animation frames
	for i in range(1, 9):
		var rpath = "res://assets/sprites/" + folder + "/run_" + str(i) + ".png"
		if ResourceLoader.exists(rpath):
			run_frames.append(load(rpath))
			
	if troop_sprites.has("S") and sprite_3d:
		sprite_3d.texture = troop_sprites["S"]

func _physics_process(delta: float) -> void:
	if attack_cooldown > 0.0:
		attack_cooldown -= delta
		
	# Decay hurt flash
	if hurt_flash_timer > 0.0:
		hurt_flash_timer -= delta
		if sprite_3d:
			sprite_3d.modulate = Color(3.5, 3.5, 3.5, 1.0) # Intense white hit flash
			sprite_3d.scale = Vector3(1.25, 0.75, 1.0)
	else:
		if sprite_3d:
			sprite_3d.modulate = Color.WHITE

	# Knockback physics
	if knockback_vel.length_squared() > 0.1:
		velocity = knockback_vel
		knockback_vel = knockback_vel.move_toward(Vector3.ZERO, delta * 35.0)
	else:
		var player = get_tree().get_first_node_in_group("player")
		if player:
			var to_player = player.global_position - global_position
			to_player.y = 0.0
			var dist = to_player.length()
			
			if dist > 1.4:
				velocity = to_player.normalized() * speed
				
				# Active Running Animation
				walk_anim_time += delta * 11.0
				if run_frames.size() == 8 and sprite_3d:
					var frame_idx = int(walk_anim_time) % 8
					sprite_3d.texture = run_frames[frame_idx]
					# Face left or right based on X velocity
					sprite_3d.flip_h = (to_player.x < -0.05)
				elif sprite_3d:
					# Fallback directional sprite
					var dir_2d = Vector2(to_player.x, to_player.z)
					var new_dir = GameManager.get_direction_8(dir_2d)
					if troop_sprites.has(new_dir):
						sprite_3d.texture = troop_sprites[new_dir]
						sprite_3d.flip_h = false

				if sprite_3d and hurt_flash_timer <= 0.0:
					var bob = abs(sin(walk_anim_time * 0.7)) * 0.12
					sprite_3d.position.y = base_sprite_y + bob
					sprite_3d.scale = Vector3.ONE
			else:
				velocity = Vector3.ZERO
				# Idle state
				if troop_sprites.has("S") and sprite_3d:
					sprite_3d.texture = troop_sprites["S"]
					sprite_3d.flip_h = false
					
				if sprite_3d and hurt_flash_timer <= 0.0:
					sprite_3d.position.y = move_toward(sprite_3d.position.y, base_sprite_y, delta * 3.0)
					var breath = sin(Time.get_ticks_msec() * 0.003) * 0.02
					sprite_3d.scale = Vector3(1.0 - breath, 1.0 + breath, 1.0)
					
				if attack_cooldown <= 0.0:
					player.take_damage(1, global_position)
					attack_cooldown = 1.2
		else:
			velocity = Vector3.ZERO
		
	move_and_slide()

func take_laser_hit(laser_col: String, hit_dir: Vector3) -> void:
	var rules = GameManager.ENEMY_INTERACTIONS.get(color_id, {})
	var outcome = rules.get(laser_col, { "action": "NONE" })
	var action = outcome["action"]
	
	hurt_flash_timer = 0.2
	knockback_vel = hit_dir.normalized() * 12.0
	
	var main_node = get_tree().current_scene
	
	if action == "KILL":
		if main_node and main_node.has_method("shake_camera"):
			main_node.shake_camera(0.45)
			
		var comic_word = GameManager.COMIC_WORDS[randi() % GameManager.COMIC_WORDS.size()]
		var col_data = GameManager.COLORS.get(color_id, GameManager.COLORS["CYAN"])
		if main_node and main_node.has_method("spawn_comic_floater"):
			main_node.spawn_comic_floater(global_position + Vector3(0, 2.2, 0), comic_word, col_data["color"])
			
		# Drop Orb
		var orb_col = GameManager.ENEMY_ORB_DROPS.get(color_id, "")
		if orb_col != "" and orb_scene:
			var orb = orb_scene.instantiate()
			get_parent().add_child(orb)
			orb.init_orb(global_position + Vector3(0, 1.0, 0), orb_col)
			
		if main_node and main_node.has_method("on_enemy_killed"):
			main_node.on_enemy_killed(self)
			
		queue_free()
	elif action == "TRANSFORM":
		var target_col = outcome["target"]
		set_enemy_color(target_col)
		if main_node and main_node.has_method("shake_camera"):
			main_node.shake_camera(0.25)
		var col_data = GameManager.COLORS.get(target_col, GameManager.COLORS["YELLOW"])
		if main_node and main_node.has_method("spawn_comic_floater"):
			main_node.spawn_comic_floater(global_position + Vector3(0, 2.2, 0), "➔ " + target_col + "!", col_data["color"])
	else:
		# Deflect
		if main_node and main_node.has_method("spawn_comic_floater"):
			main_node.spawn_comic_floater(global_position + Vector3(0, 2.2, 0), "DEFLECTED!", Color.WHITE)
