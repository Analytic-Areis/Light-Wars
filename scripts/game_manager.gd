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
	}
}

# Orb Drops from Enemy Death
const ENEMY_ORB_DROPS = {
	"CYAN": "RED",
	"MAGENTA": "GREEN",
	"YELLOW": "BLUE",
	"RED": "CYAN"
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
	
	# deg in [0, 360):
	# E: 0 (337.5 to 22.5)
	# SE: 45 (22.5 to 67.5)
	# S: 90 (67.5 to 112.5)
	# SW: 135 (112.5 to 157.5)
	# W: 180 (157.5 to 202.5)
	# NW: 225 (202.5 to 247.5)
	# N: 270 (247.5 to 292.5)
	# NE: 315 (292.5 to 337.5)
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
