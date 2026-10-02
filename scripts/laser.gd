extends Area3D

var speed: float = 24.0
var color_id: String = "RED"
var lifetime: float = 1.6
var is_player: bool = true
var has_hit: bool = false

@onready var mesh_instance: MeshInstance3D = $MeshInstance3D
@onready var omni_light: OmniLight3D = $OmniLight3D

func init_laser(pos: Vector3, dir: Vector3, col_id: String, from_player: bool = true) -> void:
	global_position = pos
	color_id = col_id
	is_player = from_player
	
	if dir.length_squared() > 0.001:
		look_at(global_position + dir, Vector3.UP)
	
	var col_data = GameManager.COLORS.get(color_id, GameManager.COLORS["RED"])
	var mat = StandardMaterial3D.new()
	mat.albedo_color = col_data["color"]
	mat.emission_enabled = true
	mat.emission = col_data["color"]
	mat.emission_energy_multiplier = 5.0
	
	if mesh_instance:
		mesh_instance.material_override = mat
	if omni_light:
		omni_light.light_color = col_data["color"]
		omni_light.light_energy = 3.5

func _physics_process(delta: float) -> void:
	if has_hit:
		return
		
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()
		return
	
	var step = -global_transform.basis.z * speed * delta
	var next_pos = global_position + step
	
	# Fail-safe proximity ray / distance check against all active enemies and orbs
	if is_player:
		for enemy in get_tree().get_nodes_in_group("enemies"):
			if is_instance_valid(enemy) and not enemy.is_queued_for_deletion():
				var ep = enemy.global_position
				# Check distance to line segment or enemy position
				var dist = (ep - next_pos).length()
				if dist < 1.3:
					has_hit = true
					var hit_dir = -global_transform.basis.z
					enemy.take_laser_hit(color_id, hit_dir)
					queue_free()
					return
					
		for orb in get_tree().get_nodes_in_group("orbs"):
			if is_instance_valid(orb) and not orb.is_queued_for_deletion():
				var op = orb.global_position
				var dist = (op - next_pos).length()
				if dist < 1.4:
					has_hit = true
					orb.take_laser_hit(color_id)
					queue_free()
					return

	global_position = next_pos

func _on_area_entered(area: Area3D) -> void:
	if has_hit: return
	if area.is_in_group("orbs"):
		has_hit = true
		var orb = area
		orb.take_laser_hit(color_id)
		queue_free()

func _on_body_entered(body: Node3D) -> void:
	if has_hit: return
	if body.is_in_group("enemies") and is_player:
		has_hit = true
		var enemy = body
		var hit_dir = -global_transform.basis.z
		enemy.take_laser_hit(color_id, hit_dir)
		queue_free()
