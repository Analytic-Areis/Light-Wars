extends Node2D

@onready var entities: Node2D = $Entities
@onready var player: CharacterBody2D = $Entities/Player
@onready var camera_2d: Camera2D = $Camera2D
@onready var hud: CanvasLayer = $HUD

var obstacle_scene = preload("res://scenes/obstacle.tscn")
var enemy_scene = preload("res://scenes/enemy.tscn")
var orb_scene = preload("res://scenes/orb.tscn")

var sanctuary_pos: Vector2 = Vector2(1352, 1502)
var sanctuary_radius: float = 210.0
var refill_timer: float = 0.0

var phase: int = 1
var enemies_left: int = 0
var kills_count: int = 0
var orbs_crafted: int = 0

func _ready() -> void:
	load_map_obstacles()
	
	if player and hud:
		player.ammo_changed.connect(hud.update_ammo)
		player.health_changed.connect(hud.update_health)
		
	start_level_1()

func load_map_obstacles() -> void:
	var json_path = "res://assets/textures/dungeon_map_data.json"
	if not FileAccess.file_exists(json_path):
		return
		
	var file = FileAccess.open(json_path, FileAccess.READ)
	var text = file.get_as_text()
	var json = JSON.new()
	var err = json.parse(text)
	if err != OK:
		return
		
	var data = json.get_data()
	var obs_list = data.get("obstacles", [])
	
	for obs in obs_list:
		var obstacle = obstacle_scene.instantiate()
		entities.add_child(obstacle)
		obstacle.position = Vector2(obs["x"], obs["y"])
		obstacle.setup(obs["tex"], obs["type"])

func start_level_1() -> void:
	phase = 1
	kills_count = 0
	orbs_crafted = 0
	
	hud.set_objective(
		"PHASE 1: CYAN TROOPS INBOUND",
		"Press [1] for RED Laser. Red Laser annihilates Cyan troops!"
	)
	
	spawn_enemy(Vector2(2900, 1300), "CYAN")
	spawn_enemy(Vector2(3200, 1800), "CYAN")
	enemies_left = 2

func spawn_enemy(pos: Vector2, col_id: String) -> void:
	var enemy = enemy_scene.instantiate()
	entities.add_child(enemy)
	enemy.position = pos
	enemy.set_enemy_color(col_id)

func on_enemy_killed(enemy: Node2D) -> void:
	kills_count += 1
	enemies_left = max(0, enemies_left - 1)
	
	if phase == 1 and enemies_left == 0:
		get_tree().create_timer(1.2).timeout.connect(init_phase_2)
	elif phase == 2 and enemies_left == 0:
		get_tree().create_timer(1.2).timeout.connect(init_phase_3)
	elif phase == 3 and enemies_left == 0:
		get_tree().create_timer(1.2).timeout.connect(init_phase_4)
	elif phase == 4 and enemies_left == 0:
		hud.show_level_clear(kills_count, orbs_crafted)

func init_phase_2() -> void:
	phase = 2
	hud.set_objective(
		"PHASE 2: MAGENTA TROOPS ARRIVING",
		"Press [2] for GREEN Laser (or craft with Red Orb + Blue Laser) to defeat Magenta!"
	)
	spawn_enemy(Vector2(3300, 1200), "MAGENTA")
	spawn_enemy(Vector2(3000, 2100), "MAGENTA")
	enemies_left = 2

func init_phase_3() -> void:
	phase = 3
	hud.set_objective(
		"PHASE 3: YELLOW TROOP INVASION",
		"Yellow troops incoming! Press [3] for BLUE Laser to eliminate them!"
	)
	spawn_enemy(Vector2(3400, 1500), "YELLOW")
	spawn_enemy(Vector2(3800, 1300), "YELLOW")
	enemies_left = 2

func init_phase_4() -> void:
	phase = 4
	hud.set_objective(
		"CLIMAX SHOWDOWN: ALL 3 TROOPS!",
		"Cyan, Magenta, and Yellow troops attack together! Use the WHITE LIGHT sanctuary to recharge!"
	)
	spawn_enemy(Vector2(3100, 1200), "CYAN")
	spawn_enemy(Vector2(3500, 1600), "MAGENTA")
	spawn_enemy(Vector2(3300, 2100), "YELLOW")
	enemies_left = 3

func on_orb_converted(orb_col: String, laser_col: String, res_col: String) -> void:
	orbs_crafted += 1

func on_player_died() -> void:
	hud.show_game_over()

func _process(delta: float) -> void:
	# Camera follows player
	if player and camera_2d:
		camera_2d.position = camera_2d.position.lerp(player.position, delta * 8.0)
		
	# White Light Refill Check
	if player and player.health > 0:
		var dist = player.position.distance_to(sanctuary_pos)
		if dist <= sanctuary_radius:
			refill_timer += delta
			if refill_timer >= 0.25:
				refill_timer = 0.0
				var refilled = false
				for c in ["RED", "GREEN", "BLUE"]:
					if player.ammo[c] < player.max_ammo_per_color:
						player.ammo[c] += 1
						refilled = true
				if refilled:
					player.emit_signal("ammo_changed", player.ammo, player.get_active_color())
					spawn_comic_floater(player.position + Vector2(0, -110), "⚡ RECHARGING RGB ⚡", Color("#00F0FF"))

func spawn_comic_floater(pos: Vector2, text: String, color: Color) -> void:
	if hud and hud.has_method("add_2d_floater"):
		hud.add_2d_floater(pos, text, color)
	elif hud and hud.has_method("add_3d_floater"):
		hud.add_3d_floater(Vector3(pos.x, 0, pos.y), text, color)
