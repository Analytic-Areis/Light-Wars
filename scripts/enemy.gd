extends CharacterBody3D

@export var color_id: String = "CYAN"
var speed: float = 3.5
var health: int = 1
var attack_cooldown: float = 0.0

var troop_sprites: Dictionary = {}
var current_dir_name: String = "S"

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
	var folder = "troop_" + color_id.to_lower()
	var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
	for d in dirs:
		var path = "res://assets/sprites/" + folder + "/" + d + ".png"
		if ResourceLoader.exists(path):
			troop_sprites[d] = load(path)
	if troop_sprites.has("S") and sprite_3d:
		sprite_3d.texture = troop_sprites["S"]

func _physics_process(delta: float) -> void:
	if attack_cooldown > 0.0:
		attack_cooldown -= delta
		
	var player = get_tree().get_first_node_in_group("player")
	if player:
		var to_player = player.global_position - global_position
		to_player.y = 0.0
		var dist = to_player.length()
		
		# Update 8-direction sprite facing player
		var dir_2d = Vector2(to_player.x, to_player.z)
		var new_dir = GameManager.get_direction_8(dir_2d)
		if new_dir != current_dir_name and troop_sprites.has(new_dir):
			current_dir_name = new_dir
			sprite_3d.texture = troop_sprites[new_dir]
			
		if dist > 1.2:
			velocity = to_player.normalized() * speed
		else:
			velocity = Vector3.ZERO
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
	
	var main_node = get_tree().current_scene
	
	if action == "KILL":
		if main_node and main_node.has_method("shake_camera"):
			main_node.shake_camera(0.4)
			
		var comic_word = GameManager.COMIC_WORDS[randi() % GameManager.COMIC_WORDS.size()]
		var col_data = GameManager.COLORS.get(color_id, GameManager.COLORS["CYAN"])
		if main_node and main_node.has_method("spawn_comic_floater"):
			main_node.spawn_comic_floater(global_position + Vector3(0, 1.8, 0), comic_word, col_data["color"])
			
		# Drop Orb
		var orb_col = GameManager.ENEMY_ORB_DROPS.get(color_id, "")
		if orb_col != "" and orb_scene:
			var orb = orb_scene.instantiate()
			get_parent().add_child(orb)
			orb.init_orb(global_position + Vector3(0, 0.8, 0), orb_col)
			
		if main_node and main_node.has_method("on_enemy_killed"):
			main_node.on_enemy_killed(self)
			
		queue_free()
	elif action == "TRANSFORM":
		var target_col = outcome["target"]
		set_enemy_color(target_col)
		var col_data = GameManager.COLORS.get(target_col, GameManager.COLORS["YELLOW"])
		if main_node and main_node.has_method("spawn_comic_floater"):
			main_node.spawn_comic_floater(global_position + Vector3(0, 1.8, 0), "➔ " + target_col + "!", col_data["color"])
	else:
		# Deflect
		velocity += hit_dir.normalized() * 3.0
		if main_node and main_node.has_method("spawn_comic_floater"):
			main_node.spawn_comic_floater(global_position + Vector3(0, 1.8, 0), "NO EFFECT", Color.WHITE)
