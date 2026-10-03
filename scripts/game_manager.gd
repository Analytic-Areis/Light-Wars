extends Node

# Color Definitions
const COLORS = {
	"RED": { "name": "Red", "color": Color("#FF2A4D"), "complementary": "CYAN" },
	"GREEN": { "name": "Green", "color": Color("#22E058"), "complementary": "MAGENTA" },
	"BLUE": { "name": "Blue", "color": Color("#2A85FF"), "complementary": "YELLOW" },
	"CYAN": { "name": "Cyan", "color": Color("#00F0FF"), "complementary": "RED" },
	"MAGENTA": { "name": "Magenta", "color": Color("#FF2AD4"), "complementary": "GREEN" },
	"YELLOW": { "name": "Yellow", "color": Color("#FFE600"), "complementary": "BLUE" },
	"WHITE": { "name": "White", "color": Color("#FFFFFF"), "complementary": "" }
}

# Enemy Combat Interaction Table (Enemy + Laser -> Action)
const ENEMY_INTERACTIONS = {
	"CYAN": {
		"RED": { "action": "KILL" },
		"GREEN": { "action": "NONE" },
		"BLUE": { "action": "NONE" },
		"CYAN": { "action": "NONE" },
		"MAGENTA": { "action": "TRANSFORM", "target": "BLUE" },
		"YELLOW": { "action": "TRANSFORM", "target": "GREEN" }
	},
	"MAGENTA": {
		"RED": { "action": "NONE" },
		"GREEN": { "action": "KILL" },
		"BLUE": { "action": "NONE" },
		"CYAN": { "action": "TRANSFORM", "target": "BLUE" },
		"MAGENTA": { "action": "NONE" },
		"YELLOW": { "action": "TRANSFORM", "target": "RED" }
	},
	"YELLOW": {
		"RED": { "action": "NONE" },
		"GREEN": { "action": "NONE" },
		"BLUE": { "action": "KILL" },
		"CYAN": { "action": "TRANSFORM", "target": "GREEN" },
		"MAGENTA": { "action": "TRANSFORM", "target": "RED" },
		"YELLOW": { "action": "NONE" }
	},
	"RED": {
		"RED": { "action": "NONE" },
		"GREEN": { "action": "TRANSFORM", "target": "YELLOW" },
		"BLUE": { "action": "TRANSFORM", "target": "MAGENTA" },
		"CYAN": { "action": "KILL" },
		"MAGENTA": { "action": "NONE" },
		"YELLOW": { "action": "NONE" }
	},
	"GREEN": {
		"RED": { "action": "TRANSFORM", "target": "YELLOW" },
		"GREEN": { "action": "NONE" },
		"BLUE": { "action": "TRANSFORM", "target": "CYAN" },
		"CYAN": { "action": "NONE" },
		"MAGENTA": { "action": "KILL" },
		"YELLOW": { "action": "NONE" }
	},
	"BLUE": {
		"RED": { "action": "TRANSFORM", "target": "MAGENTA" },
		"GREEN": { "action": "TRANSFORM", "target": "CYAN" },
		"BLUE": { "action": "NONE" },
		"CYAN": { "action": "NONE" },
		"MAGENTA": { "action": "NONE" },
		"YELLOW": { "action": "KILL" }
	}
}

# Orb Drops from Enemy Death (All enemies drop craftable orbs)
const ENEMY_ORB_DROPS = {
	"CYAN": "RED",
	"MAGENTA": "GREEN",
	"YELLOW": "BLUE",
	"RED": "RED",
	"GREEN": "GREEN",
	"BLUE": "BLUE"
}

# Orb + Laser -> New Laser Ammo
const ORB_CONVERSIONS = {
	"GREEN_RED": "YELLOW",
	"GREEN_BLUE": "CYAN",
	"RED_GREEN": "YELLOW",
	"RED_BLUE": "MAGENTA",
	"BLUE_RED": "MAGENTA",
	"BLUE_GREEN": "CYAN"
}

const COMIC_WORDS = ["KAABOOM!", "BOOM!", "1CO!", "POW!", "ZAP!"]

# Helper to compute 8-direction name from 2D vector (X-Z plane)
static func get_direction_8(dir: Vector2) -> String:
	if dir.length_squared() < 0.001:
		return "S"
	var angle = dir.angle() # radians, -PI to PI. (1,0) is E = 0, (0,1) is S = PI/2, (-1,0) is W = PI, (0,-1) is N = -PI/2
	var deg = rad_to_deg(angle)
	if deg < 0:
		deg += 360.0
	
	if deg >= 337.5 or deg < 22.5:
		return "E"
	elif deg >= 22.5 and deg < 67.5:
		return "SE"
	elif deg >= 67.5 and deg < 112.5:
		return "S"
	elif deg >= 112.5 and deg < 157.5:
		return "SW"
	elif deg >= 157.5 and deg < 202.5:
		return "W"
	elif deg >= 202.5 and deg < 247.5:
		return "NW"
	elif deg >= 247.5 and deg < 292.5:
		return "N"
	else:
		return "NE"

var troop_cache: Dictionary = {}

func _ready() -> void:
	preload_all_troop_sprites()

func preload_all_troop_sprites() -> void:
	var dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
	for col in ["cyan", "magenta", "yellow", "red", "green", "blue"]:
		var key = col.to_upper()
		troop_cache[key] = {}
		var folder = "troop_" + col
		for d in dirs:
			troop_cache[key][d] = { "idle": null, "run": [] }
			var idle_path = "res://assets/sprites/" + folder + "/" + d + "_idle.png"
			if ResourceLoader.exists(idle_path):
				troop_cache[key][d]["idle"] = load(idle_path)
			elif ResourceLoader.exists("res://assets/sprites/" + folder + "/" + d + ".png"):
				troop_cache[key][d]["idle"] = load("res://assets/sprites/" + folder + "/" + d + ".png")
			for r in range(8):
				var r_path = "res://assets/sprites/" + folder + "/" + d + "_run_" + str(r) + ".png"
				if ResourceLoader.exists(r_path):
					troop_cache[key][d]["run"].append(load(r_path))

func get_troop_sprites(col_id: String) -> Dictionary:
	if troop_cache.has(col_id):
		return troop_cache[col_id]
	return {}
