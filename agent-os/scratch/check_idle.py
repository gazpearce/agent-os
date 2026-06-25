import ctypes
import sys

class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]

def get_idle_duration():
    lii = LASTINPUTINFO()
    lii.cbSize = ctypes.sizeof(lii)
    ctypes.windll.kernel32.GetTickCount.restype = ctypes.c_uint32
    if ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii)):
        tick = ctypes.windll.kernel32.GetTickCount()
        last_input = lii.dwTime
        if tick >= last_input:
            millis = tick - last_input
        else:
            millis = (0xFFFFFFFF - last_input) + tick
        return millis / 1000.0
    return 0.0

if __name__ == '__main__':
    print(get_idle_duration())
