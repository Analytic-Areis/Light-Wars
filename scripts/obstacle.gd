extends StaticBody2D

@onready var sprite_2d: Sprite2D = $Sprite2D
@onready var col_poly: CollisionPolygon2D = $CollisionPolygon2D

static var tex_cache: Dictionary = {}

func setup(tex_name: String, obs_type: String) -> void:
	add_to_group("obstacles")
	var path = "res://assets/isometric_dungeon/Isometric/" + tex_name + ".png"
	if not tex_cache.has(path):
		if ResourceLoader.exists(path):
			tex_cache[path] = load(path)
	if tex_cache.has(path) and sprite_2d:
		sprite_2d.texture = tex_cache[path]
		
	# Adjust diamond collision footprint based on type
	if col_poly:
		if obs_type == "column":
			col_poly.polygon = PackedVector2Array([
				Vector2(0, -20), Vector2(35, 0), Vector2(0, 20), Vector2(-35, 0)
			])
		elif obs_type in ["crates", "barrel", "chest"]:
			col_poly.polygon = PackedVector2Array([
				Vector2(0, -28), Vector2(50, 0), Vector2(0, 28), Vector2(-50, 0)
			])
		elif obs_type in ["wall", "corner", "gate", "door", "scaffold"]:
			col_poly.polygon = PackedVector2Array([
				Vector2(0, -45), Vector2(100, 0), Vector2(0, 45), Vector2(-100, 0)
			])
			add_to_group("walls")
