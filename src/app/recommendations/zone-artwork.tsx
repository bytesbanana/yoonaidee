import Image from "next/image";
import { useLanguage } from "../providers/language-provider";

const bangkokScenes = ["city-street", "neighborhood-lane", "riverside"];

export function ZoneArtwork({ index, rank, detail = false }: {
  index: number;
  rank: number;
  detail?: boolean;
}) {
  const { t } = useLanguage();
  const scene = bangkokScenes[index % bangkokScenes.length];

  return (
    <div className={`relative isolate overflow-hidden bg-[#dce6dc] ${detail ? "h-40 sm:h-56" : "h-36 sm:h-auto sm:min-h-44"}`}>
      <Image
        src={`/bangkok-scenes/${scene}.webp`}
        alt=""
        fill
        loading={detail || index === 0 ? "eager" : "lazy"}
        sizes={detail ? "(min-width: 832px) 768px, 100vw" : "(min-width: 640px) 224px, 100vw"}
        className="object-cover"
      />
      <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-[#163a2f] px-3 py-1.5 text-sm font-semibold text-white">
        {t("Rank {rank}", { rank })}
      </span>
      <span className="absolute right-3 bottom-3 rounded-md bg-[#163a2f] px-2 py-1 text-xs text-white">
        {t("Bangkok illustration")}
      </span>
    </div>
  );
}
