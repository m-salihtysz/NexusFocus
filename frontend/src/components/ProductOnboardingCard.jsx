const areaOptions = [
  { id: "ogrenci", label: "Ogrenci", page: "student" },
  { id: "kurumsal", label: "Kurumsal", page: "enterprise" },
  { id: "freelance", label: "Freelance", page: "freelance" },
];

export default function ProductOnboardingCard({
  selectedArea,
  onChangeArea,
  onCreateProductPage,
}) {
  const selectedAreaMeta = areaOptions.find((item) => item.id === selectedArea) ?? areaOptions[0];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="text-lg font-semibold text-white">Giris ve Urun Secimi</h3>
      <p className="mt-2 text-sm text-slate-300">
        Kullanacagin modulu sec; ardindan sana ozel urun sayfasi acilir.
      </p>

      <label className="mt-4 block text-sm text-slate-300">
        Kullanici alani
        <select
          value={selectedArea}
          onChange={(event) => onChangeArea(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          {areaOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 rounded-xl border border-cyan-900 bg-cyan-950/30 p-4 text-sm">
        <p className="font-semibold text-cyan-100">Secilen alan: {selectedAreaMeta.label}</p>
        <p className="mt-1 text-cyan-200">Odak analizi, AI tavsiyeler ve ilgili paneller bu alana gore acilir.</p>
      </div>

      <button
        type="button"
        onClick={() =>
          onCreateProductPage({
            area: selectedAreaMeta.id,
            page: selectedAreaMeta.page,
            packageId: "standart",
            packageLabel: "NexusFocus",
          })
        }
        className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
      >
        Urun Sayfasini Ac
      </button>
    </section>
  );
}
