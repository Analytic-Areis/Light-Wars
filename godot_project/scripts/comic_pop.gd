extends Node2D

var text: String = "KAABOOM!"
var burst_color: Color = Color("#FFE600")
var age: float = 0.0
var max_life: float = 0.85
var initial_scale: float = 0.2
var peak_scale: float = 1.35
var base_rotation: float = 0.0
var rise_speed: float = 70.0

@onready var label: Label = $Label
@onready var particles: CPUParticles2D = $CPUParticles2D

func setup(pos: Vector2, word: String, col: Color) -> void:
	global_position = pos
	text = word
	burst_color = col
	base_rotation = randf_range(-0.25, 0.25)
	rotation = base_rotation
	scale = Vector2.ONE * initial_scale
	
	if label:
		label.text = text
		label.modulate = Color.WHITE
		label.add_theme_color_override("font_outline_color", Color.BLACK)
		label.add_theme_constant_override("outline_size", 9)
		label.add_theme_font_size_override("font_size", 34)
		
	if particles:
		particles.modulate = col
		particles.emitting = true
		
	queue_redraw()

func _ready() -> void:
	z_index = 100
	if label:
		label.text = text
		label.modulate = Color.WHITE
		label.add_theme_color_override("font_outline_color", Color.BLACK)
		label.add_theme_constant_override("outline_size", 9)
		label.add_theme_font_size_override("font_size", 34)
	if particles:
		particles.modulate = burst_color
		particles.emitting = true

func _process(delta: float) -> void:
	age += delta
	if age >= max_life:
		queue_free()
		return
		
	# Float upwards
	global_position.y -= rise_speed * delta
	
	# Comic punch scale animation (0.0 -> 0.12s punch, then settle)
	var t = age / max_life
	var cur_scale: float = 1.0
	if age < 0.12:
		cur_scale = lerp(initial_scale, peak_scale, age / 0.12)
	elif age < 0.25:
		cur_scale = lerp(peak_scale, 1.0, (age - 0.12) / 0.13)
	else:
		cur_scale = 1.0
		
	scale = Vector2.ONE * cur_scale
	
	# Fade out near the end
	var alpha: float = 1.0
	if t > 0.6:
		alpha = clamp(1.0 - (t - 0.6) / 0.4, 0.0, 1.0)
		
	modulate.a = alpha
	queue_redraw()

func _draw() -> void:
	# 14-pointed spiky comic starburst polygon behind the text
	var points = PackedVector2Array()
	var outer_r = 75.0
	var inner_r = 46.0
	var count = 14
	for i in range(count * 2):
		var r = outer_r if (i % 2 == 0) else inner_r
		var angle = (float(i) * PI) / float(count)
		var px = cos(angle) * r * 1.35
		var py = sin(angle) * r * 0.75
		points.append(Vector2(px, py))
		
	# Filled comic starburst in vibrant yellow
	draw_colored_polygon(points, Color("#FFE600"))
	# Thick black comic outline
	points.append(points[0])
	draw_polyline(points, Color("#12121A"), 5.0, true)
