import { X } from "lucide-react";

export default function PrivacyModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-semibold text-white">KVKK ve Gizlilik Politikasi</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm text-slate-300">
          <p>
            <strong className="text-white">NexusFocus</strong>, kullanicilarin verilerini gizlilik
            ilkelerine uygun olarak isler. Bu metin 6698 sayili KVKK kapsaminda aydinlatma amaci
            tasir.
          </p>

          <section>
            <h3 className="text-white">1. Toplanan Veriler</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Google hesap bilgileri: ad, e-posta, profil resmi (oturum acmak icin).</li>
              <li>Olcum sinyalleri: odak skoru, kirpma, bakis, postur, fare hareketleri.</li>
              <li>Mimik analizi: yorgunluk, gerginlik, dikkat, pozitiflik (yuzdesel skorlar).</li>
              <li>Tenant bilgileri: sirket adi, calisan e-postalari (kurumsal kullanimda).</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white">2. Kamera Verisi</h3>
            <p className="mt-2">
              Kamera goruntusu yalnizca tarayicida islenir. Ham frame backend tarafina veya diske
              hicbir zaman gonderilmez ya da kaydedilmez. Sadece hesaplanmis sayisal metrikler
              (kirpma, bakis, mimik skorlari) sunucuya iletilir.
            </p>
          </section>

          <section>
            <h3 className="text-white">3. Saklama Suresi</h3>
            <p className="mt-2">
              Odak oturumlari sadece kullanici hesabinin aktif oldugu sure boyunca tutulur.
              Hesabinizi silmek istediginizde kalici olarak silinir. Kurumsal raporlar
              anonimlestirilmis olarak saklanir.
            </p>
          </section>

          <section>
            <h3 className="text-white">4. Haklariniz</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Verilerinize erismeyi talep edebilirsiniz.</li>
              <li>Verilerinizin silinmesini talep edebilirsiniz.</li>
              <li>Veri aktariminin durdurulmasini talep edebilirsiniz.</li>
              <li>Kameranizi her an kapatip uygulamayi kullanmaya devam edebilirsiniz.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white">5. Iletisim</h3>
            <p className="mt-2">
              KVKK kapsamindaki haklarinizi kullanmak icin msalihtysz@gmail.com adresine yazabilirsiniz.
            </p>
          </section>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Anladim
          </button>
        </div>
      </div>
    </div>
  );
}
