import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { TableService } from '@services/table.service.js'

const tableService = new TableService(new SqliteTableRepository(dbConfig), new SqliteRestaurantRepository(dbConfig))
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

router.get('/available', tableController.listAvailable)

export default router
