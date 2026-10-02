extends CharacterBody2D

@export var color_id: String = "CYAN"
@export var speed: float = 195.0

var health: int = 1
var attack_cooldown: float = 0.0
var current_dir: String = "S"
var walk_anim_time: float = 0.0
var hurt_flash_timer: float = 0.0
var knockback_vel: Vector2 = Vector2.ZERO

var troop_sprites: Dictionary = {}
@onready var sprite_2d: Sprite2D = $Sprite2D
var orb_scene = preload("res://scenes/orb.tscn")

func _ready() -> void:
	add_to_group("enemies")
	load_sprites_for_color()
	update_sprite(true)

func set_enemy_color(new_col: String) -> void:
	color_id = new_col
	load_sprites_for_color()
	update_sprite(true)

func load_sprites_for_color() -> void:
	troop_sprites.clear()
	var folder = "troop_" + color_id.to_lower()
	var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
	for d in dirs:
		troop_sprites[d] = { "idle": null, "run": [] }
		var idle_path = "res://assets/sprites/" + folder + "/" + d + "_idle.png"
		if ResourceLoader.exists(idle_path):
			troop_sprites[d]["idle"] = load(idle_path)
		elif ResourceLoader.exists("res://assets/sprites/" + folder + "/" + d + ".png"):
			troop_sprites[d]["idle"] = load("res://assets/sprites/" + folder + "/" + d + ".png")
			
		for r in range(10):
			var r_path = "res://assets/sprites/" + folder + "/" + d + "_run_" + str(r) + ".png"
			if ResourceLoader.exists(r_path):
				troop_sprites[d]["run"].append(load(r_path))

func _physics_process(delta: float) -> void:
	if attack_cooldown > 0.0:
		attack_cooldown -= delta
		
	if hurt_flash_timer > 0.0:
		hurt_flash_timer -= delta
		if sprite_2d:
			sprite_2d.modulate = Color(3.0, 3.0, 3.0, 1.0)
	else:
		if sprite_2d:
			sprite_2d.modulate = Color.WHITE

	# Knockback decay
	if knockback_vel.length_squared() > 10.0:
		velocity = knockback_vel
		knockback_vel = knockback_vel.move_toward(Vector2.ZERO, delta * 800.0)
	else:
		var player = get_tree().get_first_node_in_group("player")
		if player:
			var to_player = player.global_position - global_position
			var dist = to_player.length()
			
			if dist > 35.0:
				var move_dir = to_player.normalized()
				velocity = move_dir * speed
				current_dir = GameManager.get_direction_8(move_dir)
				walk_anim_time += delta * 14.0
				update_sprite(false)
			else:
				velocity = Vector2.ZERO
				walk_anim_time = 0.0
				update_sprite(true)
				if attack_cooldown <= 0.0:
					player.take_damage(1, global_position)
					attack_cooldown = 1.2
		else:
			velocity = Vector2.ZERO
			update_sprite(true)

	move_and_slide()

func update_sprite(is_idle: bool) -> void:
	if not sprite_2d or not troop_sprites.has(current_dir):
		return
	var dir_data = troop_sprites[current_dir]
	if is_idle or dir_data["run"].is_empty():
		if dir_data["idle"]:
			sprite_2d.texture = dir_data["idle"]
	else:
		var frames = dir_data["run"]
		var f_idx = int(walk_anim_time) % frames.size()
		sprite_2d.texture = frames[f_idx]

func take_laser_hit(laser_col: String, hit_dir: Vector2) -> void:
	hurt_flash_timer = 0.22
	knockback_vel = hit_dir.normalized() * 320.0
	
	var rules = GameManager.ENEMY_INTERACTIONS.get(color_id, {})
	var interaction = rules.get(laser_col, { "action": "NONE" })
	var main = get_parent()
	
	match interaction.get("action"):
		"KILL":
			if main and main.has_method("spawn_comic_floater"):
				var word = GameManager.COMIC_WORDS[randi() % GameManager.COMIC_WORDS.size()]
				main.spawn_comic_floater(global_position + Vector2(0, -120), word, GameManager.COLORS[color_id]["color"])
				
			# Drop color orb
			var drop_color = GameManager.ENEMY_ORB_DROPS.get(color_id, "")
			if drop_color != "":
				var orb = orb_scene.instantiate()
				main.add_child(orb)
				orb.global_position = global_position
				orb.set_orb_color(drop_color)
				
			if main and main.has_method("on_enemy_killed"):
				main.on_enemy_killed(self)
				
			queue_free()
			
		"TRANSFORM":
			var target_color = interaction.get("target")
			set_enemy_color(target_color)
			if main and main.has_method("spawn_comic_floater"):
				main.spawn_comic_floater(global_position + Vector2(0, -120), "TRANSFORM -> " + target_color, GameManager.COLORS[target_color]["color"])
				
		"NONE":
			if main and main.has_method("spawn_comic_floater"):
				main.spawn_comic_floater(global_position + Vector2(0, -120), "DEFLECT!", Color(0.8, 0.8, 0.8))
