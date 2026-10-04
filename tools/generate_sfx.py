#!/usr/bin/env python3
import os
import wave
import struct
import math
import random

os.makedirs("assets/audio", exist_ok=True)
SAMPLE_RATE = 44100

def write_wav(filename, samples):
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)        # mono
        wav_file.setsampwidth(2)        # 16-bit
        wav_file.setframerate(SAMPLE_RATE)
        for s in samples:
            val = int(max(-1.0, min(1.0, s)) * 32767)
            wav_file.writeframes(struct.pack('<h', val))

# 1. Laser Shot (Retro arcade synth zap)
def gen_laser():
    duration = 0.18
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        freq = 880.0 * (1.0 - t / duration) ** 2 + 180.0
        env = (1.0 - t / duration) ** 1.5
        s = math.sin(2.0 * math.pi * freq * t) * 0.7 + (random.random() * 2 - 1) * 0.08
        samples.append(s * env)
    return samples

# 2. KAABOOM Explosion (Punchy comic explosion with sub-bass)
def gen_kaboom():
    duration = 0.70
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 5.5)
        # Low punch + noise rumble
        sub = math.sin(2.0 * math.pi * (140.0 * math.exp(-t * 8.0) + 45.0) * t) * 0.8
        noise = (random.random() * 2.0 - 1.0) * 0.9
        s = (sub * 0.6 + noise * 0.5) * env
        samples.append(s * 0.95)
    return samples

# 3. Hit / Deflect (Sharp metallic click)
def gen_hit():
    duration = 0.12
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 28.0)
        freq = 520.0 + (random.random() * 80.0)
        s = math.sin(2.0 * math.pi * freq * t) * 0.6 + (random.random() * 2.0 - 1.0) * 0.4
        samples.append(s * env)
    return samples

# 4. Craft / Powerup Chime
def gen_craft():
    duration = 0.40
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    freqs = [523.25, 659.25, 783.99, 1046.50] # C5, E5, G5, C6
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        step = int(t / 0.09)
        f = freqs[min(step, len(freqs) - 1)]
        env = (1.0 - t / duration)
        s = math.sin(2.0 * math.pi * f * t) * 0.75 + math.sin(4.0 * math.pi * f * t) * 0.25
        samples.append(s * env)
    return samples

# 5. Dash Whoosh
def gen_dash():
    duration = 0.22
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.sin(math.pi * (t / duration))
        noise = (random.random() * 2.0 - 1.0) * 0.7
        freq = 300.0 + (t / duration) * 400.0
        sweep = math.sin(2.0 * math.pi * freq * t) * 0.3
        samples.append((noise + sweep) * env)
    return samples

write_wav("assets/audio/laser.wav", gen_laser())
write_wav("assets/audio/kaboom.wav", gen_kaboom())
write_wav("assets/audio/hit.wav", gen_hit())
write_wav("assets/audio/craft.wav", gen_craft())
write_wav("assets/audio/dash.wav", gen_dash())

print("Audio files generated successfully!")
