import {
  composedProposalBlocks,
  type ComposedProposalDocument,
} from "@workspace/api-zod/estimate-document";
/** Shared formatter keeps every agreed paragraph and charge limit in PDF order. */
export function ComposedProposal({
  document,
}: {
  document: ComposedProposalDocument;
}) {
  return (
    <section
      aria-label="Agreement scope, pricing and terms"
      className="composed-proposal"
    >
      {composedProposalBlocks(document).map((block, index) =>
        block.kind === "heading" ? (
          <h2 key={index}>{block.text}</h2>
        ) : (
          <p
            key={index}
            style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            {block.text}
          </p>
        ),
      )}
    </section>
  );
}
