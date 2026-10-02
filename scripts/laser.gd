extends Area3D

var speed: float = 24.0
var color_id: String = "RED"
var lifetime: float = 1.4
var is_player: bool = true

@onready var mesh_instance: MeshInstance3D = $MeshInstance3D
@onready var omni_light: OmniLight3D = $OmniLight3D

func init_laser(pos: Vector3, dir: Vector3, col_id: String, from_player: bool = true) -> void:
	global_position = pos
	color_id = col_id
	is_player = from_player
	
	if dir.length_squared() > 0.001:
		look_at(global_position + dir, Vector3.UP)
	
	# Apply material emission
	var col_data = GameManager.COLORS.get(color_id, GameManager.COLORS["RED"])
	var mat = StandardMaterial3D.new()
	mat.albedo_color = col_data["color"]
	mat.emission_enabled = true
	mat.emission = col_data["color"]
	mat.emission_energy_multiplier = 4.0
	
	if mesh_instance:
		mesh_instance.material_override = mat
	if omni_light:
		omni_light.light_color = col_data["color"]
		omni_light.light_energy = 2.5

func _physics_process(delta: float) -> void:
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()
		return
	
	# Move forward along local -Z (Godot forward)
	global_position += -global_transform.basis.z * speed * delta

func _on_area_entered(area: Area3D) -> void:
	if area.is_in_group("orbs"):
		var orb = area
		var res = orb.take_laser_hit(color_id)
		queue_free()

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("enemies") and is_player:
		var enemy = body
		var hit_dir = -global_transform.basis.z
		enemy.take_laser_hit(color_id, hit_dir)
		queue_free()
