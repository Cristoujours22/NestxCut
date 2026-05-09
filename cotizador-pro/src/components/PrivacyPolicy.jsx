import React from 'react';
import { Link } from 'react-router-dom';

const Section = ({ number, title, children }) => (
  <section className="rounded-2xl border border-gray-800 bg-gray-950/60 p-5 md:p-6 space-y-3">
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300 text-sm font-bold">
        {number}
      </div>
      <h2 className="text-lg md:text-xl font-semibold text-white">{title}</h2>
    </div>
    <div className="space-y-3 text-sm md:text-base leading-7 text-gray-300">{children}</div>
  </section>
);

const BulletList = ({ items }) => (
  <ul className="space-y-2 pl-5 list-disc marker:text-cyan-400 text-gray-300">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 shadow-xl overflow-hidden">
          <div className="border-b border-gray-800 px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">Documento legal</p>
              <h1 className="text-3xl md:text-4xl font-bold mt-1">Política de Privacidad</h1>
              <p className="text-gray-400 mt-2">Cotizador Pro / NestxCUT</p>
            </div>
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 hover:underline text-sm md:text-base">
              Volver al registro
            </Link>
          </div>

          <div className="px-6 md:px-8 py-6 bg-gray-950/40 border-b border-gray-800 grid md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div><span className="text-gray-500">Responsable del tratamiento:</span> <strong className="text-white">Cristian Pelaez</strong></div>
            <div><span className="text-gray-500">Identificación:</span> <strong className="text-white">1094912367</strong></div>
            <div><span className="text-gray-500">Domicilio:</span> <strong className="text-white">Armenia, Quindío, Colombia</strong></div>
            <div><span className="text-gray-500">Correo de contacto:</span> <strong className="text-white">NESTXCUT@gmail.com</strong></div>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            <Section number="1" title="Alcance">
              <p>
                Esta Política de Privacidad describe la forma en que se recolectan, usan, almacenan y protegen los datos personales de los usuarios de la aplicación Cotizador Pro / NestxCUT.
              </p>
            </Section>

            <Section number="2" title="Datos que recolectamos">
              <BulletList
                items={[
                  'Nombre',
                  'Apellido',
                  'Correo electrónico',
                  'Celular',
                  'Cédula o NIT',
                  'Dirección',
                  'Ocupación',
                  'Empresa',
                  'Datos relacionados con suscripción, pagos, activación, renovaciones y estado de licencia',
                  'Datos técnicos necesarios para operar la aplicación, autenticar accesos, asociar licencias o prevenir usos no autorizados',
                  'Información que el usuario suministre por correo electrónico, WhatsApp o canales de soporte',
                ]}
              />
            </Section>

            <Section number="3" title="Finalidades del tratamiento">
              <BulletList
                items={[
                  'Crear y administrar la cuenta del usuario',
                  'Autenticar el acceso a la aplicación',
                  'Activar, renovar, suspender o controlar licencias o suscripciones',
                  'Verificar pagos y soportes de pago',
                  'Prestar soporte técnico y atención al usuario',
                  'Enviar comunicaciones sobre actualizaciones, mejoras, cambios funcionales o incidencias del servicio',
                  'Informar sobre planes, promociones, renovaciones u ofertas comerciales relacionadas con la aplicación',
                  'Informar sobre nuevos aplicativos, herramientas, productos o servicios desarrollados por la empresa',
                  'Cumplir obligaciones legales, contractuales y de seguridad',
                  'Prevenir fraude, accesos no autorizados o usos contrarios a los términos de uso',
                ]}
              />
            </Section>

            <Section number="4" title="Autorización">
              <p>
                El tratamiento de los datos personales se realiza con base en la autorización otorgada por el titular al registrarse, usar la aplicación, enviar información por canales de contacto o aceptar los Términos y esta Política, sin perjuicio de los casos en que la ley permita el tratamiento sin autorización previa.
              </p>
            </Section>

            <Section number="5" title="Compartición y uso interno de la información">
              <p>
                Los datos personales del Usuario no serán vendidos, comercializados ni cedidos a terceros para fines ajenos a la operación de la Aplicación ni a los productos o servicios desarrollados por la empresa.
              </p>
              <p>
                La información será utilizada exclusivamente para la creación y administración de cuentas, autenticación, activación y control de licencias, soporte técnico, validación de pagos, envío de actualizaciones, comunicaciones autorizadas y promoción de planes, aplicativos o servicios propios de la empresa.
              </p>
              <p>
                Cuando resulte estrictamente necesario para la operación de la Aplicación, el Proveedor podrá apoyarse en herramientas o servicios tecnológicos que actúan únicamente como soporte técnico, autenticación, almacenamiento, mensajería o infraestructura, sin que ello implique venta o comercialización de la información personal del Usuario.
              </p>
            </Section>

            <Section number="6" title="Comunicaciones y publicidad">
              <p>
                El usuario autoriza el envío de comunicaciones relacionadas con actualizaciones del servicio, novedades funcionales, renovaciones o vencimientos, ofertas sobre planes y nuevos productos, herramientas o aplicativos desarrollados por la empresa.
              </p>
              <p>
                El usuario podrá solicitar en cualquier momento dejar de recibir comunicaciones promocionales o comerciales. La exclusión de dichas comunicaciones puede implicar la pérdida de acceso a promociones, descuentos u ofertas comerciales futuras, pero no afectará por sí sola la validez de la cuenta o de una suscripción activa, salvo que la comunicación sea estrictamente necesaria para la operación del servicio.
              </p>
            </Section>

            <Section number="7" title="Conservación de la información">
              <p>
                Los datos personales serán conservados mientras la cuenta del usuario permanezca activa, mientras exista una relación comercial, contractual o de soporte, durante el tiempo necesario para atender solicitudes, reclamaciones, validación de pagos, trazabilidad de licencias o defensa jurídica, y durante el tiempo exigido por la ley cuando corresponda.
              </p>
              <p>
                Los datos usados con fines promocionales o comerciales podrán mantenerse hasta que el titular solicite dejar de recibir dichas comunicaciones, sin perjuicio de la conservación mínima necesaria de los datos asociados a la cuenta, pagos, activaciones, licencias, soporte y cumplimiento de obligaciones legales o contractuales.
              </p>
            </Section>

            <Section number="8" title="Derechos del titular">
              <p>El titular de los datos podrá ejercer los derechos de:</p>
              <BulletList
                items={[
                  'Conocer sus datos personales',
                  'Actualizar o rectificar la información',
                  'Solicitar prueba de la autorización otorgada',
                  'Revocar la autorización cuando proceda',
                  'Solicitar la supresión de los datos cuando legalmente sea procedente',
                  'Presentar consultas o reclamos sobre el tratamiento',
                ]}
              />
              <p>
                Estos derechos podrán ejercerse a través del correo <strong className="text-white">NESTXCUT@gmail.com</strong>.
              </p>
            </Section>

            <Section number="9" title="Seguridad de la información">
              <p>
                Se adoptarán medidas razonables de carácter técnico, administrativo y operativo para proteger la información personal contra pérdida, acceso no autorizado, alteración, uso indebido o divulgación no autorizada.
              </p>
              <p>
                No obstante, el usuario reconoce que ningún sistema es completamente infalible y que, tratándose de una aplicación tecnológica en evolución o fase beta, no puede garantizarse una seguridad absoluta ni una disponibilidad ininterrumpida.
              </p>
            </Section>

            <Section number="10" title="Datos de pagos y verificaciones">
              <p>
                Cuando el usuario realice pagos para activar o renovar su suscripción, podrá ser necesario verificar comprobantes, coincidencia de identidad, titularidad del pago y correspondencia con la base de datos del medio o aplicación de pago utilizada. Esta información se usará únicamente para validación, activación, soporte, control interno y prevención de fraude.
              </p>
            </Section>

            <Section number="11" title="Menores de edad">
              <p>
                La aplicación no está dirigida de manera principal a menores de edad. Si un menor llegara a suministrar información personal sin autorización de sus representantes, podrá solicitarse su eliminación conforme a la ley aplicable.
              </p>
            </Section>

            <Section number="12" title="Cambios a esta política">
              <p>
                Esta Política de Privacidad podrá ser modificada en cualquier momento. Las versiones actualizadas serán informadas por medios razonables dentro de la aplicación, por correo electrónico o por los canales de comunicación disponibles.
              </p>
            </Section>

            <Section number="13" title="Ley aplicable y jurisdicción">
              <p>
                Esta Política de Privacidad se rige por las leyes de la República de Colombia, en especial por las normas aplicables en materia de protección de datos personales, habeas data, comercio electrónico y protección al consumidor.
              </p>
              <p>
                Cualquier controversia relacionada con su interpretación o aplicación se someterá a los jueces competentes de <strong className="text-white">Armenia, Quindío, Colombia</strong>, sin perjuicio de las normas imperativas de protección al consumidor y protección de datos personales.
              </p>
            </Section>

            <Section number="14" title="Normatividad de referencia aplicable">
              <BulletList
                items={[
                  'Ley 1581 de 2012',
                  'Decreto 1377 de 2013',
                  'Decreto 1074 de 2015',
                  'Ley 1480 de 2011',
                  'Ley 527 de 1999',
                ]}
              />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
