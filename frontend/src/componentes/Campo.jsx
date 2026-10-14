// Rótulo + campo de formulário. Use multilinha para renderizar um textarea.
export default function Campo({ rotulo, id, multilinha = false, ...props }) {
  const Elemento = multilinha ? 'textarea' : 'input';
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <Elemento id={id} name={id} {...props} />
    </div>
  );
}
