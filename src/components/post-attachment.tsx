"use client";

import { safePostUrl } from "../lib/format";
import { parseInscriptionRef } from "../lib/inscription";
import Attachment from "./attachment";
import InscriptionAttachment from "./inscription-attachment";

// One place decides which renderer an img field gets, so the thread view and the
// compose preview can never drift. The field may be a bare inscription signature
// (on-chain media) or a plain attachment url; a non-http(s) url is dropped rather
// than linked, since on chain the field is attacker-controlled. Returns null when
// there is nothing to show.
export default function PostAttachment({ img, isOp, id }: { img?: string; isOp?: boolean; id?: string }) {
    const inscriptionSig = parseInscriptionRef(img);
    const safeImg = inscriptionSig ? null : safePostUrl(img);
    if (!inscriptionSig && !safeImg) return null;

    let fileName = "";
    if (safeImg) {
        try { fileName = decodeURIComponent(new URL(safeImg).pathname.split("/").pop() ?? "image"); }
        catch { fileName = "image"; }
    }

    return (
        <div className="file" id={id}>
            {inscriptionSig ? (
                <InscriptionAttachment sig={img!} isOp={isOp} />
            ) : (
                <>
                    <div className="fileText">
                        File: <a href={safeImg!} target="_blank" rel="noopener noreferrer">{fileName}</a>
                    </div>
                    <Attachment key={safeImg!} url={safeImg!} name={fileName} isOp={isOp} />
                </>
            )}
        </div>
    );
}
