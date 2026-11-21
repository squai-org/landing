# Squai — venta de programas

Lenguaje del flujo con el que una persona compra un programa de Squai desde el sitio: elige, paga y queda inscrita.

## Lenguaje

**Programa**:
Lo que Squai vende para que una persona lo curse (hoy, Squai One). Tiene un precio en cada moneda en que se vende.
_Evitar_: servicio, plan, producto, curso

**Precio**:
Lo que cuesta un programa en una moneda, con impuestos incluidos, desde una fecha de vigencia. La orden toma el precio vigente cuando se crea.
_Evitar_: tarifa, valor, plan

**Cliente**:
La persona que compra, identificada por su correo. Puede tener varias órdenes; sus datos de contacto son los del último formulario que envió.
_Evitar_: comprador, usuario, lead, inscrito

**Orden**:
La intención de comprar un programa, creada al enviar el formulario y antes de pagar. Fija el monto y la moneda que se cobran, y lleva el estado del pago.
_Evitar_: inscripción, registro, reserva, pedido

**Inscripción**:
El derecho de una persona a cursar un programa. Existe solo cuando una de sus órdenes está aprobada; sin pago aprobado no hay inscripción.
_Evitar_: registro, matrícula

**Precio de referencia**:
El precio de lista que la página muestra tachado junto al Precio vigente, con el porcentaje de descuento que separa a ambos. Es un texto de la página, editable desde el CMS; no lo cobra el sistema ni crea Órdenes.
_Evitar_: precio normal, precio anterior, precio tachado
