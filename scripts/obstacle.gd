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
		
	# Adjust collision footprint based on type and wall orientation
	if col_poly:
		if obs_type == "column":
			col_poly.polygon = PackedVector2Array([
				Vector2(0, -18), Vector2(25, 0), Vector2(0, 18), Vector2(-25, 0)
			])
		elif obs_type in ["crates", "barrel", "chest"]:
			# Substantial 8-sided rounded footprint matching barrel width (32px radius)
			col_poly.polygon = PackedVector2Array([
				Vector2(32, 0), Vector2(23, 16), Vector2(0, 24), Vector2(-23, 16),
				Vector2(-32, 0), Vector2(-23, -16), Vector2(0, -24), Vector2(23, -16)
			])
		elif obs_type in ["wall", "corner"]:
			add_to_group("walls")
			if "Corner" in tex_name:
				col_poly.polygon = PackedVector2Array([
					Vector2(0, -28), Vector2(38, 0), Vector2(0, 28), Vector2(-38, 0)
				])
			elif "_E" in tex_name or "_W" in tex_name:
				# Continuous straight diagonal strip along dx=128, dy=-64
				col_poly.polygon = PackedVector2Array([
					Vector2(-64, 18), Vector2(64, -46), Vector2(64, -18), Vector2(-64, 46)
				])
			else:
				# Continuous straight diagonal strip along dx=128, dy=64
				col_poly.polygon = PackedVector2Array([
					Vector2(-64, -46), Vector2(64, 18), Vector2(64, 46), Vector2(-64, -18)
				])
