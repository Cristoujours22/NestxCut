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

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl border border-gray-800 bg-gray-900 shadow-xl overflow-hidden">
          <div className="border-b border-gray-800 px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">Documento legal</p>
              <h1 className="text-3xl md:text-4xl font-bold mt-1">Términos y Condiciones</h1>
              <p className="text-gray-400 mt-2">Cotizador Pro / NestxCUT</p>
            </div>
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300 hover:underline text-sm md:text-base">
              Volver al registro
            </Link>
          </div>

          <div className="px-6 md:px-8 py-6 bg-gray-950/40 border-b border-gray-800 grid md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div><span className="text-gray-500">Proveedor / Responsable:</span> <strong className="text-white">Cristian Pelaez</strong></div>
            <div><span className="text-gray-500">Identificación:</span> <strong className="text-white">1094912367</strong></div>
            <div><span className="text-gray-500">Domicilio:</span> <strong className="text-white">Armenia, Quindío, Colombia</strong></div>
            <div><span className="text-gray-500">Correo de contacto:</span> <strong className="text-white">NESTXCUT@gmail.com</strong></div>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            <Section number="1" title="Aceptación">
              <p>Al registrarse, acceder, instalar o utilizar la aplicación Cotizador Pro / NestxCUT, el usuario acepta estos Términos y Condiciones. Si no está de acuerdo, deberá abstenerse de usar la Aplicación.</p>
            </Section>

            <Section number="2" title="Objeto del servicio">
              <p>La Aplicación es una herramienta tecnológica orientada a procesos de cotización, despiece, gestión comercial, licenciamiento y funcionalidades relacionadas con la actividad de carpinteros, independientes, talleres y empresas del sector.</p>
              <p>El Proveedor podrá modificar, actualizar, ampliar, reducir o reorganizar funcionalidades de la Aplicación en cualquier momento.</p>
            </Section>

            <Section number="3" title="Cuenta y acceso">
              <p>Para usar determinadas funciones, el usuario deberá crear una cuenta y suministrar información veraz, actualizada y completa.</p>
              <p>El usuario es responsable de:</p>
              <BulletList items={[
                'Custodiar sus credenciales de acceso',
                'Mantener la confidencialidad de su contraseña',
                'Notificar cualquier uso no autorizado de su cuenta',
                'Asegurar que la información suministrada sea correcta',
              ]} />
              <p>El Proveedor podrá restringir o suspender el acceso cuando detecte uso indebido, datos falsos, incumplimiento de estos Términos o riesgos para la seguridad de la Aplicación.</p>
            </Section>

            <Section number="4" title="Registro e información del usuario">
              <p>Durante el registro o uso de la Aplicación podrá solicitarse información como:</p>
              <BulletList items={[
                'Nombre',
                'Apellido',
                'Correo electrónico',
                'Celular',
                'Cédula o NIT',
                'Dirección',
                'Ocupación',
                'Empresa',
                'Información de pagos, licencias o activaciones',
              ]} />
              <p>El usuario declara que cuenta con autorización para suministrar dicha información y que esta corresponde a la realidad.</p>
            </Section>

            <Section number="5" title="Suscripción, pagos y renovación">
              <p>El acceso a ciertas funcionalidades de la Aplicación podrá estar sujeto al pago de una suscripción mensual en pesos colombianos (COP), en el valor informado al usuario al momento de solicitar la activación o renovación.</p>
              <p>La suscripción <strong className="text-white">no se renueva automáticamente</strong>. Cada renovación deberá ser solicitada y pagada manualmente por el usuario.</p>
              <p>Salvo disposición legal imperativa en contrario, los pagos realizados <strong className="text-white">no son reembolsables</strong>.</p>
            </Section>

            <Section number="6" title="Activación del servicio">
              <p>La activación de la suscripción <strong className="text-white">no es automática</strong>.</p>
              <p>Una vez el usuario realice el pago y el Proveedor valide su correcta recepción, identidad y correspondencia, la licencia será activada dentro de las veinticuatro (24) horas siguientes a dicha validación.</p>
              <p>El período de vigencia contratado comenzará a contarse desde la activación efectiva de la licencia en el sistema, y no desde la fecha u hora en que el usuario haya realizado el pago.</p>
            </Section>

            <Section number="7" title="Soporte del pago y validación">
              <p>Para activar o renovar una suscripción, el usuario deberá remitir el soporte o comprobante del pago por los canales autorizados por el Proveedor.</p>
              <p>Si el usuario no envía dicho soporte, el Proveedor no estará obligado a activar la suscripción.</p>
              <p>El usuario deberá poder demostrar razonablemente que la transferencia o pago fue realizado por él o por su empresa, y la información suministrada deberá coincidir con los registros y la base de datos del medio, pasarela o aplicación de pago utilizada para la validación.</p>
              <p>En caso de inconsistencias, el Proveedor podrá suspender, aplazar o negar la activación hasta que la verificación sea satisfactoria.</p>
            </Section>

            <Section number="8" title="Cancelación por parte del usuario">
              <p>El usuario podrá dejar de renovar o cancelar el uso de la Aplicación en cualquier momento.</p>
              <p>La cancelación no genera devolución total ni parcial de valores ya pagados, salvo disposición legal imperativa en contrario.</p>
            </Section>

            <Section number="9" title="Licencia de uso">
              <p>El Proveedor concede al usuario una licencia de uso limitada, revocable, no exclusiva, intransferible y no sublicenciable para utilizar la Aplicación conforme a estos Términos.</p>
              <p>El usuario no podrá:</p>
              <BulletList items={[
                'Copiar, modificar o redistribuir la Aplicación sin autorización',
                'Descompilar, desensamblar o intentar extraer su código fuente, salvo autorización legal expresa',
                'Eludir mecanismos de autenticación, licencia o seguridad',
                'Usar la Aplicación con fines ilícitos, fraudulentos o contrarios a la buena fe',
                'Revender, sublicenciar o explotar comercialmente la Aplicación sin autorización',
              ]} />
            </Section>

            <Section number="10" title="Uso permitido">
              <p>La Aplicación debe utilizarse únicamente para fines legítimos relacionados con su naturaleza funcional.</p>
              <p>El usuario será responsable por la información que cargue, la exactitud de sus datos y la revisión de cálculos, cotizaciones, documentos o resultados antes de utilizarlos comercialmente.</p>
            </Section>

            <Section number="11" title="Propiedad intelectual">
              <p>Todos los derechos sobre la Aplicación, incluyendo software, diseño, estructura, marca, contenido, lógica de funcionamiento, textos, gráficos, documentación y elementos relacionados, pertenecen al Proveedor o a sus licenciantes.</p>
              <p>Nada en estos Términos implica cesión de propiedad intelectual al usuario.</p>
            </Section>

            <Section number="12" title="Versión beta y limitación de responsabilidad">
              <p>El usuario reconoce que la Aplicación podrá operar, total o parcialmente, en fase beta, de prueba o de mejora continua.</p>
              <p>En consecuencia, la Aplicación puede presentar errores, interrupciones, pérdida temporal de información, comportamientos inesperados o resultados inexactos.</p>
              <p>El usuario acepta utilizar la Aplicación bajo su propio criterio y responsabilidad. El Proveedor no garantiza que la Aplicación esté libre de errores, que opere de forma ininterrumpida, ni que sea plenamente apta para un propósito particular.</p>
              <p>En todo caso, cualquier limitación de responsabilidad se aplicará únicamente en la máxima medida permitida por la ley aplicable.</p>
            </Section>

            <Section number="13" title="Disponibilidad del servicio">
              <p>El Proveedor hará esfuerzos razonables para mantener la Aplicación operativa, pero no garantiza disponibilidad permanente, continua o ininterrumpida.</p>
            </Section>

            <Section number="14" title="Suspensión o terminación">
              <p>El Proveedor podrá suspender, restringir o terminar el acceso del usuario cuando exista incumplimiento de estos Términos, fraude, uso de datos falsos, riesgos de seguridad, inconsistencias en pagos o licencias vencidas o bloqueadas.</p>
              <p>La terminación del acceso no extingue obligaciones previas del usuario ni elimina automáticamente registros que deban conservarse por razones legales, técnicas, contractuales o de trazabilidad.</p>
            </Section>

            <Section number="15" title="Datos personales">
              <p>El tratamiento de datos personales se rige por la Política de Privacidad de la Aplicación, la cual hace parte integral de estos Términos.</p>
              <p>El usuario declara haber leído y aceptado dicha Política.</p>
            </Section>

            <Section number="16" title="Comunicaciones">
              <p>El usuario autoriza el envío de comunicaciones relacionadas con funcionamiento del servicio, activaciones, renovaciones, soporte técnico, novedades, actualizaciones, ofertas, planes o productos propios del Proveedor.</p>
            </Section>

            <Section number="17" title="Cambios a los términos">
              <p>El Proveedor podrá modificar estos Términos en cualquier momento.</p>
              <p>Las versiones actualizadas serán informadas por medios razonables dentro de la Aplicación, por correo electrónico o mediante canales de comunicación disponibles.</p>
            </Section>

            <Section number="18" title="Ley aplicable y jurisdicción">
              <p>Estos Términos se rigen por las leyes de la República de Colombia.</p>
              <p>Cualquier controversia relacionada con su interpretación, ejecución o aplicación se someterá a los jueces competentes de <strong className="text-white">Armenia, Quindío, Colombia</strong>, sin perjuicio de las normas imperativas de protección al consumidor que resulten aplicables.</p>
            </Section>

            <Section number="19" title="Contacto">
              <p>Para soporte, consultas, reclamaciones o solicitudes relacionadas con la Aplicación, el usuario podrá comunicarse a <strong className="text-white">NESTXCUT@gmail.com</strong>.</p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
