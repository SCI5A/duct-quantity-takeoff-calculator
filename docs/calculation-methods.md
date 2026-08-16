# Calculation Methods — Sprint 1

هذه الوثيقة تصف محرك الحسابات الحالي. جميع الأطوال الداخلية تُحوّل إلى المتر قبل الحساب، وجميع المساحات إلى m²، والأوزان إلى kg. القيم الفارغة أو غير الصالحة تُرفض ولا تُحوّل إلى صفر.

## 1. Geometry and units

For a rectangular duct, perimeter in meters is:

```text
P = 2 × (Wmm + Hmm) ÷ 1000
```

For a round duct:

```text
P = π × Dmm ÷ 1000
```

Net duct area is:

```text
Net duct area = P × Length(m) × Quantity
```

## 2. Duct waste and procurement

```text
Duct waste area = Net duct area × Duct waste rate ÷ 100
Procurement duct area = Net duct area + Duct waste area
```

The application exposes these values separately in the summary, BOQ, CSV, and formula viewer. This prevents net design quantity from being confused with procurement quantity.

## 3. Insulation thickness and waste

Insulation thickness is stored in millimeters and normalized to meters only when calculating volume:

```text
Net insulation area = Net duct area
Insulation waste area = Net insulation area × Insulation waste rate ÷ 100
Procurement insulation area = Net insulation area + Insulation waste area
Insulation volume = Procurement insulation area × Insulation thickness(mm) ÷ 1000
```

Adhesive and tape are based on procurement insulation area:

```text
Adhesive(kg) = Procurement insulation area × Adhesive rate(kg/m²)
Tape(m) = Procurement insulation area × Tape rate(m/m²)
```

## 4. Sheet material density and weight

The material model currently supports the following densities:

| Material | Density |
|---|---:|
| Galvanized steel | 7850 kg/m³ |
| Aluminum | 2700 kg/m³ |
| Stainless steel | 8000 kg/m³ |

Weight is separated into net and procurement values:

```text
Net sheet weight = Net duct area × Sheet thickness(mm) ÷ 1000 × Density(kg/m³)
Waste weight = Duct waste area × Sheet thickness(mm) ÷ 1000 × Density(kg/m³)
Procurement sheet weight = Procurement duct area × Sheet thickness(mm) ÷ 1000 × Density(kg/m³)
```

The selected material density is recorded with every BOQ item and exported to CSV. The density values are project defaults and must be checked against the approved material submittal.

## 5. Joint and accessory quantities

The current Sprint 1 joint rule remains the existing takeoff rule: if the user enters zero joints, the application estimates `Quantity - 1`; otherwise it uses the explicit joint count.

```text
Joint perimeter = P × Effective joints × 2
G-Flange = Joint perimeter
Gasket = Joint perimeter
Rectangular corners = 8 × Effective joints
Cleats = ceil(Joint perimeter ÷ Cleat spacing(m))
Silicone tubes = ceil(Joint perimeter ÷ Tube coverage(m/tube))
Bolts/Nuts = Cleats
```

This is the baseline engine only. Detailed joint types, fittings, reinforcement, pressure class, professional BOQ pricing, and cost estimation are intentionally deferred to later sprints.

## 6. Auditability and data safety

Calculation functions live in `assets/js/calculations.js` and are tested independently from the DOM. Saved legacy items are migrated into `ductItemsV4`; malformed local storage is discarded safely with a visible message. The formula viewer shows the main inputs and outputs for each BOQ item.

These are quantity-takeoff estimates. They must be checked against approved project specifications, fabrication details, pressure class, manufacturer data, and the project’s commercial rules before procurement or fabrication.
