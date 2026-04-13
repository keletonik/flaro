export const PERTRONIC_KNOWLEDGE = `PERTRONIC FIRE ALARM SYSTEMS — TECHNICAL REFERENCE (32 manuals loaded)

=== FIRE INDICATOR PANELS ===
F220: Flagship addressable FIP. 2–8 SLC loops, up to 1984 devices (248/loop). AS 7240.2 compliant. 216-page manual. Supports PertroNet networking (RS-485/fibre), BACnet, Modbus. Built-in 2-line LCD, 220 zone indicators. Fault types: loop open/short, earth fault, device fault, PSU fail, battery fail, comm fault. Programming via front panel or FireMap software.

F100A: Mid-range addressable FIP. 1–2 SLC loops, up to 254 devices/loop. AS 4428.1 compliant. 109-page manual. RS-485 networking, TCP/IP optional. Zones: 126 programmable. Supports cause-and-effect programming. Fault codes: loop fault, detector fault, sounder fault, zone fault, PSU trouble.

F100AVR-256: Enhanced F100A variant. 1–2 loops, 256 addresses/loop. AS 4428 compliant. 140-page manual. VR = Voice Routing capability for EWIS. Built-in amplifier options 60W/120W. Supports up to 8 speaker circuits.

F120A: Compact addressable FIP. 1 SLC loop, up to 254 devices. AS 4428 compliant. 100-page manual. Cost-effective single-loop solution. Same SLC protocol as F100A/F220. Wall-mount or 19" rack.

F16e: Conventional FIP. 4/8/16 zones. AS 4428 compliant. 41-page manual. Zone-based detection (not addressable). Supports class A or B wiring. Built-in 1.5A charger. Common faults: zone open/short, earth fault, charger fail, battery disconnected.

=== EVACUATION & WARNING SYSTEMS (EWIS) ===
EA60: 60W Emergency Warning & Intercommunication System. AS 1670.4 compliant. 132-page manual. 8 speaker circuits, 4 warden intercoms. Integrates with F100A/F220 via RS-485. Supports tone + voice evacuation.

EA120: 120W EWIS. AS 1670.4 compliant. 138-page manual. 16 speaker circuits, 8 warden intercoms. Dual amplifier redundancy. Network-capable across multiple buildings.

EVAC50W24V: 50W 24V evacuation amplifier. 31-page manual. Standalone or FIP-integrated. 2 speaker circuits. AS 2220 compliant.

EVACGEN: Evacuation tone generator module. 32-page manual. Generates Alert and Evacuation tones per AS 2220. Programmable tone sequences.

ADM-4: 4-input Audio Distribution Module. 21-page manual. Routes audio from EWIS to speaker circuits. RS-485 networked.
ADM-2: 2-input Audio Distribution Module. 14-page manual. Compact version of ADM-4.

=== NETWORK & COMMUNICATIONS ===
PertroNet: RS-485 network connecting up to 32 panels. Max cable: 1.2km (RS-485), extendable via fibre. Network Manual: 63 pages. Supports peer-to-peer cause-and-effect between panels.

NET2CARD: Network interface card for F100A/F220. 74-page manual. Adds TCP/IP connectivity for remote monitoring. BACnet/IP and Modbus TCP support.

Ethernet Gateway: RS-485 to Ethernet bridge. 29-page manual. Connects legacy panels to IP networks. Supports remote monitoring via FireMap.

=== LOOP DEVICES (SLC) ===
ITM (Intelligent Terminal Module): Interface for conventional devices on SLC loops. 20-page manual. Types: ITM-I (input/monitor), ITM-O (output/relay), ITM-IO (input+output).

Loop Relay: SLC-addressable relay module. 10-page manual. Form-C relay contacts. Used for ancillary control (fans, doors, dampers).

Loop Responder: SLC-addressable conventional zone interface. 22-page manual. Connects 2-wire conventional detectors to addressable loop. Compatible with most conventional smoke/heat detectors.

Multi-Function Loop Responder: Enhanced responder with 8 conventional zones on one SLC address. 32-page manual. AS 4428 compliant. Configurable zone types (smoke, thermal, manual call point, sprinkler flow switch).

=== INTERFACE MODULES (SPIB) ===
SPIB-Modbus: Modbus RTU interface for Pertronic panels. 23-page manual. Allows BMS integration via RS-485 Modbus.
SPIB-NCPP: Notification Calling Point Panel interface. 22-page manual.
SPIB-Protectowire: Linear heat detection interface. 13-page manual. Connects Protectowire LHD cable to Pertronic SLC.
SPIB-LIOS: Fibre optic linear heat detection interface. 13-page manual.

=== ANCILLARY EQUIPMENT ===
ARC2 (Annunciator Remote Control): Remote annunciation/control panel. 63-page manual. Mirrors FIP display at remote location. RS-485 connected.
AUX-PSU: Auxiliary power supply for ancillary loads. 10-page manual. 24VDC, up to 3A. Battery charging. Monitored output.
Fan Controller: Smoke management fan controller. AS 1668 compliant. 19-page manual.
Bows Controller: Bows stairwell pressurisation controller. 19-page manual.
Agent Release: Gaseous fire suppression release module. AS 2220 compliant. 60-page manual. Dual-stage release with abort. Interfaces with F100A/F220.

=== SOFTWARE ===
FireMap: PC-based programming and monitoring software. 96-page manual. Program panels, create cause-and-effect, real-time monitoring, event log review, graphical site maps. Connects via RS-232 or Ethernet.

=== COMMON TROUBLESHOOTING ===
Loop faults: Check SLC wiring continuity, verify EOL device, check for short circuits. Use panel diagnostics to identify faulty device address.
Earth faults: Isolate loop sections to find moisture ingress or cable damage. Check detector bases for water. Megger test cables.
PSU/charger faults: Check mains supply, verify battery connections, test battery voltage under load. Replace batteries >4 years old.
Comm faults (network): Verify RS-485 termination (120Ω), check cable polarity, confirm baud rate settings match across panels.
Detector faults: Clean smoke chamber, replace if >10 years (AS 1851). Check addressing, verify loop power within spec (16-28VDC).
EWIS faults: Check speaker circuit impedance, verify amplifier output, test warden intercom connections, check tone generator settings.
`;
