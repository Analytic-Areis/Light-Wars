extends CanvasLayer

@onready var health_container: HBoxContainer = $MarginContainer/HealthBar
@onready var ammo_container: HBoxContainer = $BottomBar/AmmoRack
@onready var objective_title: Label = $TopBanner/VBox/TitleLabel
@onready var objective_desc: Label = $TopBanner/VBox/DescLabel
@onready var win_modal: PanelContainer = $WinModal
@onready var game_over_modal: PanelContainer = $GameOverModal
@onready var floaters_layer: Control = $Floaters

var active_floaters: Array = []

func _ready() -> void:
	if win_modal: win_modal.visible = false
	if game_over_modal: game_over_modal.visible = false

func set_objective(title: String, desc: String) -> void:
	if objective_title: objective_title.text = title.to_upper()
	if objective_desc: objective_desc.text = desc

func update_health(current: int, max_hp: int) -> void:
	if not health_container: return
	for i in range(health_container.get_child_count()):
		var heart = health_container.get_child(i)
		if heart is TextureRect or heart is ColorRect:
			heart.modulate = Color.RED if i < current else Color(0.3, 0.3, 0.3, 0.5)

func update_ammo(ammo_dict: Dictionary, active_col: String) -> void:
	if not ammo_container: return
	var order = ["RED", "GREEN", "BLUE", "CYAN", "MAGENTA", "YELLOW"]
	for i in range(order.size()):
		var c_id = order[i]
		if i < ammo_container.get_child_count():
			var slot = ammo_container.get_child(i)
			var count_label = slot.get_node_or_null("CountLabel")
			var highlight = slot.get_node_or_null("Highlight")
			if count_label:
				count_label.text = str(ammo_dict.get(c_id, 0))
			if highlight:
				highlight.visible = (c_id == active_col)

func add_3d_floater(pos_3d: Vector3, text: String, color: Color) -> void:
	var label = Label.new()
	label.text = text
	label.modulate = color
	label.add_theme_font_size_override("font_size", 22)
	label.add_theme_color_override("font_outline_color", Color.BLACK)
	label.add_theme_constant_override("outline_size", 6)
	
	if floaters_layer:
		floaters_layer.add_child(label)
		active_floaters.append({
			"label": label,
			"pos": pos_3d,
			"y_offset": 0.0,
			"life": 1.0,
			"max_life": 1.0
		})

func _process(delta: float) -> void:
	var camera = get_viewport().get_camera_3d()
	if not camera: return
	
	for i in range(active_floaters.size() - 1, -1, -1):
		var f = active_floaters[i]
		f["life"] -= delta
		f["y_offset"] += delta * 1.5
		
		if f["life"] <= 0.0:
			f["label"].queue_free()
			active_floaters.remove_at(i)
			continue
			
		var world_p = f["pos"] + Vector3(0, f["y_offset"], 0)
		if camera.is_position_behind(world_p):
			f["label"].visible = false
		else:
			f["label"].visible = true
			var screen_p = camera.unproject_position(world_p)
			f["label"].position = screen_p - f["label"].size / 2.0
			f["label"].modulate.a = f["life"] / f["max_life"]

func show_level_clear(kills: int, orbs: int) -> void:
	if win_modal:
		var stats_lbl = win_modal.get_node_or_null("VBox/StatsLabel")
		if stats_lbl:
			stats_lbl.text = "Troops Defeated: " + str(kills) + "\nOrbs Crafted: " + str(orbs)
		win_modal.visible = true

func show_game_over() -> void:
	if game_over_modal:
		game_over_modal.visible = true

func _on_restart_pressed() -> void:
	get_tree().reload_current_scene()
