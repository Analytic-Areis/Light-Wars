extends Node3D

@onready var player = $Player
@onready var camera = $Camera3D
@onready var hud = $HUD
@onready var white_light_pad = $WhiteLightPad

var enemy_scene = preload("res://scenes/enemy.tscn")
var orb_scene = preload("res://scenes/orb.tscn")

var phase: int = 1
var enemies_left: int = 0
var kills_count: int = 0
var orbs_crafted: int = 0

var refill_timer: float = 0.0

func _ready() -> void:
	if player and hud:
		player.ammo_changed.connect(hud.update_ammo)
		player.health_changed.connect(hud.update_health)
	
	start_level_1()

func start_level_1() -> void:
	phase = 1
	kills_count = 0
	orbs_crafted = 0
	
	hud.set_objective(
		"PHASE 1: CYAN TROOPS INBOUND",
		"Press [1] for RED Laser. Red Laser annihilates Cyan troops!"
	)
	
	# Spawn 2 Cyan troops
	spawn_enemy(Vector3(6.0, 0.0, -3.0), "CYAN")
	spawn_enemy(Vector3(8.0, 0.0, 3.0), "CYAN")
	enemies_left = 2

func spawn_enemy(pos: Vector3, col_id: String) -> void:
	var enemy = enemy_scene.instantiate()
	add_child(enemy)
	enemy.global_position = pos
	enemy.set_enemy_color(col_id)

func on_enemy_killed(enemy: Node3D) -> void:
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
		"PHASE 2: MAGENTA TROOP ARRIVES",
		"Press [2] for GREEN Laser (or shoot Red Orb with Blue Laser for Magenta) to destroy Magenta troop!"
	)
	spawn_enemy(Vector3(9.0, 0.0, -1.0), "MAGENTA")
	spawn_enemy(Vector3(7.0, 0.0, 4.0), "MAGENTA")
	enemies_left = 2

func init_phase_3() -> void:
	phase = 3
	hud.set_objective(
		"PHASE 3: YELLOW TROOP INFILTRATION",
		"Yellow troops incoming! Press [3] for BLUE Laser to eliminate them!"
	)
	spawn_enemy(Vector3(8.0, 0.0, -4.0), "YELLOW")
	spawn_enemy(Vector3(10.0, 0.0, 2.0), "YELLOW")
	enemies_left = 2

func init_phase_4() -> void:
	phase = 4
	hud.set_objective(
		"CLIMAX SHOWDOWN: ALL 3 TROOPS!",
		"Cyan, Magenta, and Yellow troops attack together! Use the glowing WHITE LIGHT to recharge!"
	)
	# All 3 troops spawn simultaneously
	spawn_enemy(Vector3(7.0, 0.0, -5.0), "CYAN")
	spawn_enemy(Vector3(9.0, 0.0, 0.0), "MAGENTA")
	spawn_enemy(Vector3(8.0, 0.0, 5.0), "YELLOW")
	enemies_left = 3

func on_orb_converted(orb_col: String, laser_col: String, res_col: String) -> void:
	orbs_crafted += 1

func shake_camera(amt: float = 0.35) -> void:
	if camera and camera.has_method("shake"):
		camera.shake(amt)

func on_player_died() -> void:
	hud.show_game_over()

func _process(delta: float) -> void:
	# White Light Refill Zone Check
	if white_light_pad and player and player.health > 0:
		var dist = (player.global_position - white_light_pad.global_position).length()
		if dist <= 3.8:
			refill_timer += delta
			if refill_timer >= 0.28:
				refill_timer = 0.0
				var refilled = false
				if player.ammo["RED"] < player.max_ammo_per_color:
					player.ammo["RED"] += 1
					refilled = true
				if player.ammo["GREEN"] < player.max_ammo_per_color:
					player.ammo["GREEN"] += 1
					refilled = true
				if player.ammo["BLUE"] < player.max_ammo_per_color:
					player.ammo["BLUE"] += 1
					refilled = true
					
				if refilled:
					player.emit_signal("ammo_changed", player.ammo, player.get_active_color())
					spawn_comic_floater(white_light_pad.global_position + Vector3(0, 1.8, 0), "⚡ RECHARGING RGB ⚡", Color("#00F0FF"))

func spawn_comic_floater(pos: Vector3, text: String, color: Color) -> void:
	if hud and hud.has_method("add_3d_floater"):
		hud.add_3d_floater(pos, text, color)
