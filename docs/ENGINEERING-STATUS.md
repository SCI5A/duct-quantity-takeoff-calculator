# Engineering Status

## Official Status

> **PRODUCTION-READY AS AN ENGINEERING CALCULATION / TAKEOFF SOFTWARE FRAMEWORK, WITH EXPLICITLY DECLARED ENGINEERING LIMITATIONS — NOT YET A UNIVERSALLY VALIDATED FINAL FABRICATION STANDARD.**

هذا السجل يثبت الحالة التشغيلية والهندسية الحالية للمشروع. وهو سجل توثيقي فقط؛ لا يضيف معادلات أو قواعد تصنيع أو مصادر خارجية، ولا يغير أي نتيجة إنتاجية.

## Current Sprint Status

| Sprint | Status |
|---|---|
| Sprint 3.2 | CLOSED: PASS WITH ENGINEERING LIMITATIONS |
| Sprint 4 | CLOSED: PASS WITH ENGINEERING LIMITATIONS |
| Sprint 4.1 | CLOSED: PASS WITH ENGINEERING LIMITATIONS |
| Sprint 4.2 | CLOSED: PASS WITH ENGINEERING LIMITATIONS |
| Sprint 4.3 | CLOSED: PASS WITH ENGINEERING LIMITATIONS |
| Sprint 5 | NOT STARTED |

## Engineering Classification

| Classification | Meaning in this project |
|---|---|
| `CALCULATED` | نتيجة ناتجة من قاعدة حسابية مكتملة، مع عدم اعتبارها معيار تصنيع إلا إذا كان مصدر القاعدة قابلًا للتتبع. |
| `ESTIMATED` | تقدير حسابي معلن مبني على قاعدة تقديرية أو هندسة مبسطة، وليس اعتماد تصنيع نهائيًا. |
| `INPUT_REQUIRED` | لا توجد مدخلات أو قاعدة كافية لإنتاج كمية مسؤولة. لا يتم اختراع رقم بديل. |
| `NOT_APPLICABLE` | العنصر أو القاعدة لا ينطبق على نوع الدكت أو الـFitting أو الـJoint المحدد. |
| `UNVERIFIED` | القاعدة موجودة في التطبيق أو في سجل داخلي، لكن لا يوجد مصدر هندسي خارجي قابل للمراجعة يثبتها. |
| `PROJECT_INPUT` | قيمة أدخلها المستخدم أو المشروع، مثل الأبعاد أو معدلات الهالك أو التباعد. |
| `PROJECT_SPEC` | مصدر مشروع فعلي محدد؛ لا توجد وثيقة من هذا النوع حاليًا داخل المستودع. |
| `STANDARD_REFERENCE` | معيار أو Code قابل للتطبيق ومحدد المصدر؛ لا يوجد حاليًا مصدر من هذا النوع داخل المستودع. |
| `USER_DEFINED` | قيمة يحددها المستخدم، مثل Fabrication Area أو Silicone Coverage Rate. |
| `LEGACY_ESTIMATE` | قيمة محفوظة من سجل قديم للتوافق، ولا تعني اعتمادًا هندسيًا جديدًا. |

**Mathematical correctness** تعني أن البرنامج طبق الصيغة المدخلة حسابيًا. **Software correctness** تعني أن التحقق والحفظ والاختبارات والتكامل تعمل كما صُممت. أما **Engineering/Fabrication validation** فتتطلب مواصفة أو رسمًا أو بيانات تصنيع قابلة للتتبع. لا يجوز الخلط بين هذه المستويات.

## Current Fittings Status

| Fitting | Rule ID | Current Status | Source | Formula / Basis | Engineering Limitation |
|---|---|---|---|---|---|
| `ELBOW` | `FGR-ELBOW-CENTERLINE-ARC-V1` | `ESTIMATED` | `UNVERIFIED` | `Perimeter × Centerline Arc × Quantity` | نموذج تقدير هندسي هندسيًا مبسط؛ لا يثبت Gore Layout أو Seam Allowance أو Connection Allowance. |
| `TEE` | `FGR-TEE-FABRICATION-AREA-REQUIRED-V1` | `INPUT_REQUIRED` | `UNVERIFIED` | Fabrication Area أو Geometry Rule موثقة مطلوبة | لا تستخدم معادلة الدكت المستقيم تلقائيًا. |
| `REDUCER` | `FGR-REDUCER-FABRICATION-AREA-REQUIRED-V1` | `INPUT_REQUIRED` | `UNVERIFIED` | Fabrication Area أو Geometry Rule موثقة مطلوبة | لا يتم اختراع مساحة من أبعاد عامة دون قاعدة تصنيع. |
| `TRANSITION` | `FGR-TRANSITION-FABRICATION-AREA-REQUIRED-V1` | `INPUT_REQUIRED` | `UNVERIFIED` | Fabrication Area أو Geometry Rule موثقة مطلوبة | لا يتم افتراض تطوير الشكل أو مساحة التصنيع. |
| `OFFSET` | `FGR-OFFSET-FABRICATION-AREA-REQUIRED-V1` | `INPUT_REQUIRED` | `UNVERIFIED` | Fabrication Area أو Geometry Rule موثقة مطلوبة | لا يتم افتراض مسار أو تطوير تصنيع. |
| `END_CAP` | `FGR-END-CAP-END-FACE-V1` | `ESTIMATED` | `UNVERIFIED` | `End-face Area × Quantity` | لا تتضمن افتراض Flange أو Gasket أو Corners أو Bolts أو تفاصيل الإغلاق. |
| `CUSTOM_FITTING` | `FGR-CUSTOM-FABRICATION-RULE-REQUIRED-V1` | `INPUT_REQUIRED` | `UNVERIFIED` | Fabrication Area أو قاعدة مخصصة موثقة مطلوبة | لا يتم إنتاج مساحة أو قاعدة تصنيع بالتخمين. |

## Elbow Current Model

المعادلة الحالية للكوع هي:

```text
Perimeter × Centerline Arc × Quantity
```

وتصنف كـ **Geometric Estimating Model**، وليست **Final Fabrication Development**.

لا يتضمن النموذج الحالي افتراضات أو بدلات لـ:

- Gore Layout
- Throat/Heel Geometry
- Seam Allowance
- Connection Allowance
- Fabrication Pattern
- Nesting Allowance

## End Cap

المعادلة الحالية هي:

```text
End-face Area × Quantity
```

وهي `ESTIMATED / UNVERIFIED`. لا يفترض النموذج Flange أو Gasket أو Corners أو Bolts أو أي Connection Detail لنهاية القطعة.

## TEE / REDUCER / TRANSITION / OFFSET

لا تستخدم هذه الأنواع معادلة الدكت المستقيم تلقائيًا. عند غياب Fabrication Area أو Geometry Rule موثقة، تكون الحالة `INPUT_REQUIRED`، ولا يتم اختراع مساحة أو Formula بديلة.

## Connection Rules

قواعد الاتصال الخاصة بكل Fitting غير موثقة حاليًا لكل نوع. لذلك لا يتم افتراض أو توريث قواعد الدكت المستقيم تلقائيًا لـ:

- G-Flange
- Corners
- Cleats
- Gasket
- Bolts
- Nuts
- Washers
- Silicone

## Pressure Class

Pressure Class حاليًا:

```text
INPUT/BASIS ONLY
```

ولا يغير Thickness أو Geometry أو Cleat Spacing أو Bolt Spacing أو Accessories إلا عند وجود Rule موثقة قابلة للتتبع.

## Joint Engine

تستخدم Fittings قيمة `Total Joints` الصادرة من Joint Engine فقط. لا تعيد Fittings حساب `Total Joints`، ولا تنشئ Sections أو Joints جديدة داخلها.

الأوضاع المعتمدة في Joint Engine هي `PER_RUN` و`GLOBAL` و`MANUAL`، وتبقى مسؤولية حساب Sections وJoints داخل Joint Engine.

## Project Sources

| Source Type | Current Availability | Engineering Use | Limitation |
|---|---|---|---|
| `docs/calculation-methods.md` | موجود | يصف المعادلات البرمجية الحالية ووحداتها وحدودها. | وثيقة داخلية، وليست مواصفة تصنيع خارجية. |
| `docs/ENGINEERING-VERIFICATION-SPRINT-1.1.md` | موجود | تقرير تدقيق داخلي يميز الصحة الرياضية عن القيود الهندسية. | ليس Code أو Manufacturer Data أو Approved Fabrication Detail. |
| `assets/js/fittings.js` وRule Model | موجود | مصدر التنفيذ الفعلي لـRule IDs وFormula وStatus وBasis. | يمثل قواعد التطبيق الحالية ولا يثبت معيار تصنيع عالميًا. |
| `PROJECT_SPEC` | غير متوفر داخل المستودع | لا يمكن استخدامه حاليًا لاعتماد قاعدة. | يتطلب وثيقة مشروع فعلية قابلة للمراجعة. |
| `MANUFACTURER_DATA` | غير متوفر داخل المستودع | لا يمكن استخدامه حاليًا لاعتماد Geometry أو Connection Rule. | يتطلب Technical Data فعليًا. |
| `APPROVED_DETAIL` / `SHOP_DRAWING` / `FABRICATION_DRAWING` | غير متوفر داخل المستودع | لا يمكن اعتماد تطوير أو بدلات تصنيع. | يتطلب رسمًا معتمدًا قابلًا للتتبع. |
| `CAM/NESTING` | غير متوفر داخل المستودع | لا يمكن اعتماد Nesting أو Scrap Rule. | يتطلب مخرجات تصنيع فعلية. |
| `CODE_STANDARD` / `STANDARD_REFERENCE` | غير متوفر داخل المستودع | لا يمكن تحويل قاعدة إلى Standard Reference. | يتطلب معيارًا محددًا وقابلًا للتطبيق على المشروع. |

لا تُعامل الوثائق الداخلية أو تقارير التدقيق الداخلية كمعيار تصنيع خارجي.

## Required Evidence for Future `CALCULATED` Status

تحويل أي Fitting Rule إلى `CALCULATED` يتطلب مصدرًا هندسيًا فعليًا قابلًا للتتبع، مثل Approved Shop Drawing أو Fabrication Detail أو Manufacturer Data أو Project Specification أو Approved Detail أو Applicable Code/Standard.

أي مصدر جديد يجب أن يمر بالتسلسل التالي:

```text
Source Validation
→ Applicability
→ Rule Extraction
→ Geometry Formula
→ Numerical Verification
→ Regression Test
→ Status Decision
```

لا تتحول القاعدة إلى `CALCULATED` لمجرد أن معادلتها صحيحة رياضيًا.

## Engineering Limitations

المشروع لا يثبت عالميًا حاليًا ما يلي:

- Fabrication Development
- CNC Nesting
- Seam Allowance
- Gore Layout
- Connection Allowances
- Fitting-specific Bolt/Cleat Rules
- Pressure Class Engineering Rules
- Universal Manufacturing Standards

## Audit Trail

كان Sprint 4.3 تدقيقًا للمصادر فقط، ولم يغير:

- Production formulas
- Production results
- Fitting calculations
- Joint Engine
- Accessories Engine
- Pressure Class behavior

## Official Restriction

> **THIS SOFTWARE MUST NOT BE INTERPRETED AS A UNIVERSALLY VALIDATED FABRICATION STANDARD.**

يجب مراجعة الحسابات الهندسية مقابل مواصفة المشروع المعمول بها، ورسومات التصنيع المعتمدة، وبيانات المصنع، والمعايير القابلة للتطبيق قبل التصنيع أو الشراء.

## Future Source Validation

عند توفر وثيقة هندسية جديدة، تبدأ المراجعة بـ`ELBOW` فقط. لا يتم تعديل جميع Fittings في مهمة واحدة، ولا يتم الانتقال إلى Fitting آخر قبل إغلاق ELBOW بالأدلة والاختبارات.

التسلسل الإلزامي هو:

```text
Source Validation
→ Applicability
→ Geometry Formula
→ Numerical Verification
→ Regression Test
→ Status Decision
```

## Official Scope Restriction

Sprint 5 غير مبدوء. كما لم تبدأ Sprint 4.4 أو أي Feature جديدة بناءً على هذا السجل. لا توجد في هذه الوثيقة إضافة لمعيار أو Code Rule أو Manufacturing Rule.
