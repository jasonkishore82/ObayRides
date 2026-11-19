# Obay Rides

Self-driving (autonomous) electric carts for the Indian market, starting with **tourism** on private or semi-private land, using **golf carts** as the base vehicle.

---

## 1. Idea Assessment

### Original idea: self-driving tuk-tuks on Indian roads

**What's good**
- Huge market. India has millions of auto-rickshaws, central to last-mile transport.
- Real pain points: driver availability, fare disputes (meter refusals, overcharging), safety. App-based fixed fares solve them.
- Tuk-tuks are small and slow (~25–40 km/h), so crashes are less deadly. They suit short, fixed routes.
- A distinctive pitch for investors and smart-city programs.

**Hard parts**
1. **Road conditions:** mixed traffic, pedestrians, cows, wrong-way vehicles, potholes, no lane discipline. Beyond what Waymo-style systems handle today.
2. **Regulation:** the Motor Vehicles Act requires a licensed human driver; India has resisted driverless vehicles to protect driver jobs.
3. **Politics and jobs:** millions of livelihoods depend on auto drivers; unions and politicians would push back.
4. **Cost:** vehicle is ~₹2–3 lakh; a lidar and compute stack costs many times that. Needs very cheap sensors (e.g. camera-only).
5. **Safety and liability:** one serious accident could end the company.

### Chosen direction: tourism first, with golf carts

**Why it works**
- Private or semi-private land (resorts, heritage sites, botanical gardens, universities, theme parks, large temple complexes) is mostly outside normal road-traffic rules.
- Low speed (10–20 km/h) makes safety far easier.
- Fixed, mappable loops: no need for general autonomy.
- Tourists pay for novelty; operators want to cut staffing costs and add attractions.
- Electric golf carts are widely available in India and easy to modify.

---

## 2. Phased Plan

1. **Pick one site and one route.** A resort or campus with a 1–3 km loop. Get a written pilot agreement.
2. **Build the prototype.** Electric cart + drive-by-wire steering/throttle/brake, RTK GPS, camera(s), low-cost lidar or ultrasonic sensors, emergency stop.
3. **Run supervised.** Safety operator on board. Log every disengagement.
4. **Go driverless on the geofenced loop.** Add remote monitoring, then charge for rides.
5. **Expand to more sites.** Package as a repeatable product (robotaxi-as-a-service, or own fleet).

### Business model options
- Sell or lease carts to resorts (B2B).
- Run the service and keep a share of ticket revenue.
- Subscription for software and fleet management.

### Risks
- Pedestrians walking onto paths (slow speeds + reliable obstacle stopping).
- Rain, dust and glare affecting sensors.
- Insurance for a novel vehicle (start conversations early).
- Site owners reluctant to be first (offer a free or discounted pilot).
- Hardware cost: keep the autonomy kit well under the cart plus a driver's wages over a couple of years.

---

## 3. Vehicle and Cost Estimates (rough, confirm with suppliers)

### Electric golf cart in India (new)

| Type | Approx. price |
|---|---|
| 4-seater (basic, local makers e.g. Kinetic Green, Lazer, Eco Cart) | ₹3–5 lakh |
| 6-seater | ₹4–7 lakh |
| 8-seater or premium/imported (Club Car, EZGO, Yamaha) | ₹6–12 lakh+ |
| Used / refurbished | ₹1.5–3 lakh |

**Price factors:** battery type (lithium costs ₹1–2 lakh more but lasts longer and is lighter), import duty and GST, customization and branding.

**Selection criteria for autonomy:** a controller you can interface with (CAN bus or accessible throttle signal) and a good braking system.

### Autonomy kit (approx.)

| Part | Cost |
|---|---|
| Drive-by-wire steering actuator + controller | ₹50,000–1.5 lakh |
| RTK GPS | ₹30,000–1 lakh |
| Cameras | ₹10,000–40,000 |
| Low-cost lidar | ₹30,000–1.5 lakh |
| Compute (Jetson-class) | ₹40,000–1 lakh |
| E-stop, wiring, enclosures | ₹20,000–50,000 |

**Rough prototype budget:** ₹5–10 lakh for one vehicle (₹3–6 lakh with a used cart and basic sensors).

---

## 4. Passenger Sensing and Smart App / Band

### Goal
When a passenger enters the cart, the system detects who they are and where they sit, greets them, and lets them set their destination in the app.

### NFC is not enough for position
NFC range is ~4 cm: use it for **tap-to-check-in** at the entrance or seat, not tracking.

### Sensing options

| Method | Good for | Cost |
|---|---|---|
| BLE beacons/anchors in the cart (phone or band as tag) | Which zone or seat (~1 m accuracy) | Low |
| UWB | Precise position (~10–30 cm); needs supported phones | Medium |
| Seat pressure/weight sensors | Is the seat occupied | Very low |
| Camera + computer vision | Counting people, detecting standing/leaving | Medium |

**Recommended for a 4–6 seat cart:** NFC tap at boarding + BLE for "who's in the cart" + seat sensors for occupancy. UWB is overkill.

### Phone app vs. wristband
- **Phone only:** cheapest and fastest. QR as a fallback.
- **Wristbands (NFC/BLE):** good for resorts (no app install; can double as room key or payment token). Adds hardware cost and lost-band problem. Treat as phase 2.

### Passenger flow
1. Passenger books or taps in; app or band identifies them.
2. Cart senses boarding; seat sensor or BLE confirms zone.
3. Cart greets them by name (speaker or screen), in their language.
4. Passenger picks a destination in the app, or on an in-cart tablet as backup.
5. Cart verifies everyone is seated/buckled, then drives off.
6. On arrival it announces the stop and confirms everyone has left.

### Other considerations
- **Safety lock:** the cart must not move until seat sensors confirm everyone is seated.
- **Privacy:** location tracking needs consent, minimal data storage, DPDP Act compliance.
- **Offline use:** resort areas have patchy signal; the cart must work without internet (local sensors + saved map). Use the internet only for monitoring, bookings and updates.
- **Language:** Hindi and English at minimum; local languages at tourist sites.

### Suggested starting stack
- Mobile app: Flutter or React Native
- Backend: Firebase or a small Node/Python server
- In-cart: ESP32 or Raspberry Pi with BLE, seat sensors, small display
- Cart communication: MQTT

---

## 5. Future Improvement: Automatic Ride Charging

Charge the passenger automatically when the ride ends, with the end detected by the phone/band leaving the cart.

### Why the phone leaving alone is not reliable
- **False ends:** BLE can drop while the passenger is still seated (phone in a bag, interference, low battery).
- **Missed ends:** phone left behind or dead mid-ride.
- **Group rides:** one person leaving does not mean the ride has ended.
- **Disputes:** automatic charges with no confirmation lead to chargebacks.

### Recommended: combine signals
End the ride when all agree:
1. Cart stopped at a mapped drop-off point (GPS).
2. Seat sensor shows the seat is empty.
3. Phone/band out of BLE range for 10–20 seconds.

If signals disagree, flag the ride for review instead of charging.

### Fare model
- **Fixed fare per route:** simplest; tourists like certainty; shown before boarding.
- **Distance/time based:** closer to a taxi; needs accurate distance tracking.

### Payments in India
- **UPI** is dominant. Use UPI AutoPay (e-mandate) or a prepaid wallet.
- Payment gateway (Razorpay, Cashfree, PhonePe) for cards and UPI.
- RBI rules require a pre-set mandate with limits and notifications for automatic debits. Use a pre-authorized amount or wallet balance, and send a receipt right after the ride.
- For resorts: **add the charge to the guest's room bill** and skip the payment flow.

### Good practices
- Show fare before the ride; send a receipt after.
- Let passengers dispute a charge in the app.
- Cap the maximum charge per ride.
- Handle offline: store the ride locally and sync when signal returns.

### Placement
Phase 2 feature. For the first pilot use QR/UPI at drop-off or room charge, while still collecting sensor data to test auto-pay.

---

## 6. Roadmap

| Phase | Scope |
|---|---|
| **1. Pilot** | One site, one route, supervised autonomy, NFC/QR check-in, seat sensors, fixed fare, UPI/room-charge payment |
| **2. Smart experience** | BLE zone sensing, personalised greeting, in-app destination choice, automatic charging with multi-signal ride end |
| **3. Scale** | Wristbands, multiple sites, fleet dashboard, remote monitoring, per-site product packaging |

---

## 7. Open Questions

- Is the cart fully driverless, or driver-optional/assisted at first?
- Which sites or locations are targeted for the pilot?
- Budget and team (technical background, funding)?
- Do we already have a cart or hardware?

---

## 8. Next Steps

- [ ] Choose the pilot site and route
- [ ] Get quotes from EV cart makers
- [ ] Draft the pilot proposal for resort owners
- [ ] Prototype parts list and budget sheet
- [ ] System architecture sketch (cart, app, backend)
- [ ] Set up a git repo / GitHub (`git` is installed; `gh` CLI is not)
