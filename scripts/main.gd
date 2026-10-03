extends Node2D

@onready var entities: Node2D = $Entities
@onready var player: CharacterBody2D = $Entities/Player
@onready var camera_2d: Camera2D = $Camera2D
@onready var hud: CanvasLayer = $HUD

var obstacle_scene = preload("res://scenes/obstacle.tscn")
var enemy_scene = preload("res://scenes/enemy.tscn")
var orb_scene = preload("res://scenes/orb.tscn")
var comic_pop_scene = preload("res://scenes/comic_pop.tscn")

var sfx_laser = preload("res://assets/audio/laser.wav")
var sfx_kaboom = preload("res://assets/audio/kaboom.wav")
var sfx_hit = preload("res://assets/audio/hit.wav")
var sfx_craft = preload("res://assets/audio/craft.wav")
var sfx_dash = preload("res://assets/audio/dash.wav")

var sanctuary_pos: Vector2 = Vector2(1352, 1502)
var sanctuary_radius: float = 210.0
var refill_timer: float = 0.0

var trauma: float = 0.0
var max_shake_offset: float = 20.0

func play_sfx(stream: AudioStream, pitch: float = 1.0) -> void:
	if not stream: return
	var asp = AudioStreamPlayer.new()
	asp.stream = stream
	asp.pitch_scale = pitch
	add_child(asp)
	asp.play()
	asp.finished.connect(asp.queue_free)

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

var is_transitioning: bool = false

func start_level_1() -> void:
	phase = 1
	kills_count = 0
	orbs_crafted = 0
	is_transitioning = false
	
	hud.set_objective(
		"PHASE 1: CYAN TROOPS INBOUND",
		"Press [1] for RED Laser. Red Laser annihilates Cyan troops!"
	)
	
	spawn_enemy(Vector2(2000, 1400), "CYAN")
	spawn_enemy(Vector2(2100, 1600), "CYAN")
	enemies_left = 2

func spawn_enemy(pos: Vector2, col_id: String) -> void:
	var enemy = enemy_scene.instantiate()
	enemy.color_id = col_id
	entities.add_child(enemy)
	enemy.position = pos
	enemy.set_enemy_color(col_id)
	
	# Seamless chromatic warp-in materialize effect (zero cuts / zero pop-in)
	enemy.modulate.a = 0.0
	var tw = create_tween()
	tw.tween_property(enemy, "modulate:a", 1.0, 0.3)

func on_enemy_killed(enemy: Node2D) -> void:
	kills_count += 1
	enemies_left = max(0, enemies_left - 1)
	
	if enemies_left == 0 and not is_transitioning:
		if phase == 4:
			hud.show_level_clear(kills_count, orbs_crafted)
		else:
			is_transitioning = true
			hud.set_objective(
				"WAVE " + str(phase) + " SECURED!",
				"Next wave incoming..."
			)
			get_tree().create_timer(0.8).timeout.connect(advance_to_next_phase)

func advance_to_next_phase() -> void:
	is_transitioning = false
	if phase == 1:
		init_phase_2()
	elif phase == 2:
		init_phase_3()
	elif phase == 3:
		init_phase_4()

func init_phase_2() -> void:
	phase = 2
	hud.set_objective(
		"PHASE 2: MAGENTA TROOPS ARRIVING",
		"Press [2] for GREEN Laser (or craft with Red Orb + Blue Laser) to defeat Magenta!"
	)
	spawn_enemy(Vector2(2300, 1380), "MAGENTA")
	spawn_enemy(Vector2(2400, 1620), "MAGENTA")
	enemies_left = 2

func init_phase_3() -> void:
	phase = 3
	hud.set_objective(
		"PHASE 3: YELLOW TROOP INVASION",
		"Yellow troops incoming! Press [3] for BLUE Laser to eliminate them!"
	)
	spawn_enemy(Vector2(2500, 1400), "YELLOW")
	spawn_enemy(Vector2(2650, 1600), "YELLOW")
	enemies_left = 2

func init_phase_4() -> void:
	phase = 4
	hud.set_objective(
		"CLIMAX SHOWDOWN: ALL 3 TROOPS!",
		"Cyan, Magenta, and Yellow troops attack together! Use the WHITE LIGHT sanctuary to recharge!"
	)
	spawn_enemy(Vector2(2200, 1380), "CYAN")
	spawn_enemy(Vector2(2500, 1500), "MAGENTA")
	spawn_enemy(Vector2(2350, 1620), "YELLOW")
	enemies_left = 3

func on_orb_converted(orb_col: String, laser_col: String, res_col: String) -> void:
	orbs_crafted += 1

func on_player_died() -> void:
	hud.show_game_over()

func add_camera_shake(amount: float = 0.4) -> void:
	trauma = min(1.0, trauma + amount)

func _process(delta: float) -> void:
	# Camera follows player with juice & screen shake
	if player and camera_2d:
		var target = player.position
		if trauma > 0.0:
			trauma = max(0.0, trauma - delta * 2.2)
			var shake_amount = trauma * trauma
			target += Vector2(
				randf_range(-1.0, 1.0) * max_shake_offset * shake_amount,
				randf_range(-1.0, 1.0) * max_shake_offset * shake_amount
			)
		camera_2d.position = camera_2d.position.lerp(target, delta * 10.0)
		
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
					spawn_comic_floater(player.position + Vector2(0, -90), "RECHARGING", Color("#00F0FF"))

func spawn_comic_floater(pos: Vector2, text: String, color: Color) -> void:
	var pop = comic_pop_scene.instantiate()
	entities.add_child(pop)
	pop.setup(pos, text, color)
	
	if text.contains("BOOM") or text.contains("POW") or text.contains("1CO") or text.contains("ZAP"):
		play_sfx(sfx_kaboom, randf_range(0.92, 1.08))
	elif text.contains("CRAFTED"):
		play_sfx(sfx_craft, randf_range(0.98, 1.02))
	elif text.contains("DEFLECT"):
		play_sfx(sfx_hit, randf_range(1.1, 1.3))
