// چیدمان گروه تب‌ها: پنج صفحه‌ی اصلی داخل NativeTabs قرار می‌گیرند.
// نام تریگرها («index» و غیره) نسبت به همین گروه است؛ URLها بدون تغییر
// می‌مانند چون اسم گروه در پرانتز، بخشی از URL نیست.
import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  return <AppTabs />;
}
