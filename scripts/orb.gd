extends Area3D

var color_id: String = "GREEN"
var hover_time: float = 0.0
var base_y: float = 1.0

@onready var mesh_instance: MeshInstance3D = $MeshInstance3D
@onready var omni_light: OmniLight3D = $OmniLight3D

func init_orb(pos: Vector3, col_id: String) -> void:
	global_position = pos
	base_y = pos.y
	color_id = col_id
	add_to_group("orbs")
	update_visuals()

func update_visuals() -> void:
	var col_data = GameManager.COLORS.get(color_id, GameManager.COLORS["GREEN"])
	var mat = StandardMaterial3D.new()
	mat.albedo_color = col_data["color"]
	mat.emission_enabled = true
	mat.emission = col_data["color"]
	mat.emission_energy_multiplier = 3.5
	mat.roughness = 0.1
	mat.metallic = 0.3
	
	if mesh_instance:
		mesh_instance.material_override = mat
	if omni_light:
		omni_light.light_color = col_data["color"]

func _process(delta: float) -> void:
	hover_time += delta * 3.0
	global_position.y = base_y + sin(hover_time) * 0.25
	rotate_y(delta * 1.5)

func take_laser_hit(laser_col: String) -> bool:
	var key = color_id + "_" + laser_col
	var res_color = GameManager.ORB_CONVERSIONS.get(key, "")
	if res_color != "":
		# Successful conversion!
		var main_node = get_tree().current_scene
		if main_node and main_node.has_method("spawn_comic_floater"):
			main_node.spawn_comic_floater(global_position, "+" + res_color + " AMMO!", GameManager.COLORS[res_color]["color"])
		
		var player = get_tree().get_first_node_in_group("player")
		if player:
			player.add_ammo(res_color, 2)
			
		if main_node and main_node.has_method("on_orb_converted"):
			main_node.on_orb_converted(color_id, laser_col, res_color)
			
		queue_free()
		return true
	else:
		var main_node = get_tree().current_scene
		if main_node and main_node.has_method("spawn_comic_floater"):
			main_node.spawn_comic_floater(global_position, "DEFLECT!", Color.WHITE)
		return false
