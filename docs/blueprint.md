# **App Name**: Mudarib Accounting

## Core Features:

- Financial Dashboard: Dashboard overview of key financial metrics (revenues, profits, debts, bookings).
- Booking Management: Management of bookings, including adding, editing, and deleting, and PDF smart-ticket entry.
- Remittance Tracking: Record and manage remittances from various sources with customizable settings.
- Subscription Management: Handle subscriptions including customer details, installment plans and payment tracking
- Client and Supplier Management: Manage customer and supplier information efficiently, allowing quick access and updates.
- Automated Voucher categorization: Generate suggested expense categories or general ledger accounts. This tool can categorize and classify expenses entered into the system using generative AI, streamlining bookkeeping tasks and minimizing manual data entry for things like voucher and report entries.

## Style Guidelines:

- Primary color: A soft, inviting blue (#73A2FF) to inspire trust and stability in financial tasks.
- Background color: A very light, desaturated blue (#F0F5FF), almost white, to keep the focus on the content.
- Accent color: A vibrant orange (#FF9933) to draw attention to important actions and calls to action.
- Body and headline font: 'PT Sans', a modern and readable sans-serif font suitable for both headlines and body text, ensures the content is easily accessible.
- Use modern, clean icons related to finance and travel to aid navigation.
- Implement a right-to-left (RTL) layout for full Arabic language support, ensuring ease of use for Arabic-speaking users.

### Responsive layout patterns

- استخدم المكوّن الجديد `PageContainer` لتغليف صفحات لوحة التحكم، فهو يعتمد نهج Mobile-first ويضبط تلقائيًا العرض الأقصى (`--page-max-width`) مع الحشوات المتدرجة (`--page-padding-*`). يمكن تعديل هذه القيم عند الحاجة عبر تمرير خصائص `style` مخصّصة.
- لبناء ترويسات الصفحات استخدم `PageHeader` الذي يوفّر توزيعًا مرنًا بين العناوين والإجراءات، ويتحول تلقائيًا إلى توزيع أفقي ابتداءً من الشاشات المتوسطة (`sm:`) مع محاذاة مناسبة للاتجاه RTL.
- استخدم `PageSection` عند الحاجة إلى مقاطع ذات حدود أو خلفية فرعية. المكوّن يعتمد Flex مع فجوات قابلة للتخصيص، ويستخدم نقاط التحوّل (`sm:` و`lg:`) لتكبير الحشوات تدريجيًا.
- عند إنشاء شبكات داخل المقاطع استخدم `grid` أو `flex` مع فواصل Tailwind (`sm:grid-cols-2`, `xl:grid-cols-3`، إلخ) لضمان عمل التصميم بدءًا من عرض 320px وحتى الشاشات العريضة.
