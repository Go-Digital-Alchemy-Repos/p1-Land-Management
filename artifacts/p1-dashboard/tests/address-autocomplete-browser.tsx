import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { AddressAutocomplete } from "../src/AddressAutocomplete";
import "../src/style.css";

const suggestion = {
  id: "synthetic-stallings",
  label: "120 Guion Lane, Stallings, NC 28105, United States of America",
  line1: "120 Guion Lane",
  city: "Stallings",
  state: "NC",
  postalCode: "28105",
  businessName: null,
};

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => String(input).startsWith("/api/v1/address-suggestions")
  ? Promise.resolve(new Response(JSON.stringify({ available: true, suggestions: [suggestion] }), { headers: { "Content-Type": "application/json" } }))
  : originalFetch(input, init);

function Form() {
  const [address, setAddress] = useState({ addressLine1: "", city: "", state: "", postalCode: "" });
  return <main style={{ maxWidth: 700, margin: "40px auto", padding: 24 }}>
    <h1>Add property — synthetic address selection check</h1>
    <form onSubmit={(event) => event.preventDefault()}>
      <AddressAutocomplete label="Address line 1" value={address.addressLine1} format="line1" completeOnly
        onValueChange={(addressLine1) => setAddress((current) => ({ ...current, addressLine1 }))}
        onAddressSelect={(selected) => setAddress((current) => ({ ...current, addressLine1: selected.line1, city: selected.city, state: selected.state, postalCode: selected.postalCode }))} />
      <label>City<input value={address.city} onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} /></label>
      <label>State<input value={address.state} onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value }))} /></label>
      <label>ZIP code<input value={address.postalCode} onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value }))} /></label>
    </form>
  </main>;
}

createRoot(document.getElementById("root")!).render(<Form />);
