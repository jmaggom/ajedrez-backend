import { NotificationType } from '@prisma/client';
import { sendPushNotification } from '../common/notification/notification.service';

const test = async () => {
    // Cambiá el userId por uno que exista en tu DB
    await sendPushNotification({
        userId: 1,
        type: NotificationType.registration,
        title: 'Test notification',
        message: 'Esta es una notificación de prueba',
        data: { test: 'true' }
    });
    console.log('Done');
};
test();