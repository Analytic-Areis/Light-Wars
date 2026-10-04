extends Camera3D

@export var target_path: NodePath
var target: Node3D = null

var offset: Vector3 = Vector3(0, 14.0, 11.0)
var shake_amount: float = 0.0

func _ready() -> void:
	if has_node(target_path):
		target = get_node(target_path)
	rotation_degrees = Vector3(-50.0, 0.0, 0.0)

func shake(intensity: float = 0.3) -> void:
	shake_amount = max(shake_amount, intensity)

func _process(delta: float) -> void:
	if not target:
		target = get_tree().get_first_node_in_group("player")
		
	if target:
		var target_pos = target.global_position + offset
		global_position = global_position.lerp(target_pos, delta * 7.0)
		
	if shake_amount > 0.0:
		h_offset = (randf() - 0.5) * shake_amount * 1.5
		v_offset = (randf() - 0.5) * shake_amount * 1.5
		shake_amount -= delta * 1.8
		if shake_amount < 0.0:
			shake_amount = 0.0
			h_offset = 0.0
			v_offset = 0.0
