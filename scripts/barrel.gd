extends StaticBody2D

@onready var sprite_2d: Sprite2D = $Sprite2D
@onready var col_poly: CollisionPolygon2D = $CollisionPolygon2D

var tex_barrel = preload("res://assets/isometric_dungeon/Isometric/barrelsStacked_N.png")
var orb_scene = preload("res://scenes/orb.tscn")

var health: int = 3
var hit_tween: Tween = null
var flash_timer: float = 0.0

func _ready() -> void:
	add_to_group("obstacles")
	add_to_group("barrels")
	if sprite_2d and not sprite_2d.texture:
		sprite_2d.texture = tex_barrel

func _process(delta: float) -> void:
	if flash_timer > 0.0:
		flash_timer -= delta
		if flash_timer <= 0.0 and sprite_2d:
			sprite_2d.modulate = Color.WHITE

func on_hit(projectile_col: String = "") -> void:
	health -= 1
	flash_timer = 0.12
	if sprite_2d:
		sprite_2d.modulate = Color(2.5, 2.5, 2.5, 1.0)
	
	# Cancel previous hit animation to prevent warping scale glitches
	if hit_tween and hit_tween.is_valid():
		hit_tween.kill()
		if sprite_2d:
			sprite_2d.scale = Vector2.ONE
			
	var main = get_tree().current_scene
	
	if health <= 0:
		# Destroyed!
		if main and main.has_method("spawn_comic_floater"):
			main.spawn_comic_floater(global_position + Vector2(0, -60), "CRASH!", Color("#D2A679"))
		if main and main.has_method("add_camera_shake"):
			main.add_camera_shake(0.2)
			
		# Chance to drop a strategic color orb
		if randf() < 0.65 and orb_scene:
			var orb = orb_scene.instantiate()
			orb.position = global_position
			var possible_colors = ["RED", "GREEN", "BLUE"]
			var drop_c = possible_colors[randi() % possible_colors.size()]
			orb.set_orb_color(drop_c)
			if main and main.get_node_or_null("Entities"):
				main.get_node("Entities").call_deferred("add_child", orb)
			else:
				get_parent().call_deferred("add_child", orb)
				
		queue_free()
	else:
		# Impact jiggle
		hit_tween = create_tween()
		hit_tween.tween_property(sprite_2d, "scale", Vector2(1.08, 0.94), 0.04)
		hit_tween.tween_property(sprite_2d, "scale", Vector2(0.97, 1.03), 0.05)
		hit_tween.tween_property(sprite_2d, "scale", Vector2.ONE, 0.05)
		if main and main.has_method("spawn_comic_floater"):
			var word = "THUD!" if health == 2 else "CRACK!"
			main.spawn_comic_floater(global_position + Vector2(0, -50), word, Color(0.85, 0.85, 0.85))
