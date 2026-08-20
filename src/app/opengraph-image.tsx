import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "./seo";

export const alt = "Magisa 테크 블로그 아카이버";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #F7F7FC 0%, #E9F1FF 100%)",
          color: "#171719",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "80px 96px",
          width: "100%",
        }}
      >
        <div style={{ color: "#315BDE", display: "flex", fontSize: 34, marginBottom: 28 }}>{SITE_NAME}</div>
        <div style={{ display: "flex", fontSize: 78, letterSpacing: "-3px", lineHeight: 1.2 }}>
          테크 블로그 새 글을
          <br />
          한곳에서
        </div>
        <div style={{ color: "#5C5C66", display: "flex", fontSize: 30, lineHeight: 1.5, marginTop: 32 }}>
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    size,
  );
}
