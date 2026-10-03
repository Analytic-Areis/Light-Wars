extends StaticBody2D

@onready var sprite_2d: Sprite2D = $Sprite2D
@onready var col_shape: CollisionShape2D = $CollisionShape2D

var tex_barrel = preload("res://assets/isometric_dungeon/Isometric/barrelsStacked_N.png")

func _ready() -> void:
	add_to_group("obstacles")
	add_to_group("barrels")
	if sprite_2d and not sprite_2d.texture:
		sprite_2d.texture = tex_barrel

func _draw() -> void:
	# 2.5D contact ground shadow for physical presence
	draw_circle(Vector2(0, 0), 32.0, Color(0, 0, 0, 0.55))
	draw_circle(Vector2(4, 2), 24.0, Color(0, 0, 0, 0.35))

func on_hit(projectile_col: String = "") -> void:
	# Subtle contact jiggle
	var tw = create_tween()
	tw.tween_property(sprite_2d, "scale", Vector2(1.08, 0.92), 0.06)
	tw.tween_property(sprite_2d, "scale", Vector2(1.0, 1.0), 0.08)
