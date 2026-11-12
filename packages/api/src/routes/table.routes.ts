import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const tableService = new TableService(new SqliteTableRepository(dbConfig), new SqliteRestaurantRepository(dbConfig))
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

const STAFF = ['admin', 'manager', 'camarero', 'cocinero']

router.get('/', authenticate, authorize(STAFF), tableController.getAll)
router.post('/', authenticate, authorize(['admin']), tableController.create)
router.get('/:id', authenticate, authorize(STAFF), tableController.getById)
router.put('/:id', authenticate, authorize(['admin']), tableController.update)
router.delete('/:id', authenticate, authorize(['admin']), tableController.delete)
router.patch('/:id/status', authenticate, authorize(['admin', 'manager', 'camarero']), tableController.changeStatus)
router.post('/:id/occupy', authenticate, authorize(['cliente']), tableController.occupy)

export default router
