# Duct Quantity & Accessories Calculator

حاسبة كميات الدكت وملحقاته، جاهزة للنشر على GitHub Pages، وتعمل حاليًا على **Sprint 1: Calculation Engine Foundation**.

## وظائف Sprint 1 الحالية

تشمل الحاسبة الدكت المستطيل والدائري، تطبيع الوحدات، التحقق الصارم من المدخلات، حفظًا محليًا محميًا مع ترحيل بيانات `ductItemsV3` إلى `ductItemsV4`، ونموذج كثافات لمواد الصاج: Galvanized steel وAluminum وStainless steel.

يعرض المحرك القيم منفصلة إلى **Net** و**Waste** و**Procurement** للدكت والعزل والوزن. كما يعرض الغراء والشريط وG-Flange وFlange Corners وCleats/Clamps وGasket وSilicone Sealant وBolts & Nuts داخل BOQ وCSV.

يحتوي كل بند BOQ على زر **المعادلات** لعرض مسار الحساب، بما في ذلك المحيط، المساحة الصافية، الهالك، كمية التوريد، حجم العزل، الوزن الصافي ووزن التوريد.

## العرض التعليمي

يمكن فتح العرض من الصفحة الرئيسية أو مباشرة عبر:

```text
https://sci5a.github.io/duct-quantity-takeoff-calculator/presentation/
```

يقرأ العارض عدد الشرائح من `presentation/slides/manifest.json`، ويدعم التنقل والمصغرات والملء الكامل والتشغيل التلقائي ولوحة المفاتيح وSwipe.

## الاختبارات وبوابات الجودة

تشغيل الاختبارات محليًا:

```bash
node tests/engineering-tests.js
node tests/quality-gates.js
```

تتحقق Engineering Test Suite من الأشكال والوحدات والهالك والعزل والكثافة والوصلات والملحقات وفصل الوزن. وتتحقق Quality Gates من المسارات والملفات المطلوبة وربط labels وإمكانية الوصول وmanifest وعدم وجود inline handlers وإعداد Workflow.

GitHub Actions يشغّل فحص الصياغة والاختبارات وبوابات الجودة قبل نشر GitHub Pages. لا يبدأ النشر إذا فشل أي اختبار.

## وثيقة المعادلات

المرجع الهندسي للمحرك موجود في [`docs/calculation-methods.md`](docs/calculation-methods.md). الكثافات الافتراضية تقديرية ويجب مراجعتها مقابل اعتماد المادة وTechnical Data Sheet ومواصفات المشروع.

## GitHub Pages

الرابط المنشور:

```text
https://sci5a.github.io/duct-quantity-takeoff-calculator/
```

يتم النشر من الفرع `main` عبر GitHub Actions. Sprints الخاصة بمحرك الوصلات المتقدم، الملحقات المتقدم، الفittings، التدعيم وفئة الضغط، وBOQ الاحترافي والتكلفة **مؤجلة عمدًا** حتى اعتماد Sprint 1.
