const createAdmin = require('../index')

const { secureRandom, createCluster, newLogger, createTopic } = require('testHelpers')

describe('Admin', () => {
  let existingTopicName, numPartitions, admin, consumer

  beforeEach(async () => {
    existingTopicName = `test-topic-${secureRandom()}`
    numPartitions = 4

    await createTopic({ topic: existingTopicName, partitions: numPartitions })
  })

  afterEach(async () => {
    await admin.disconnect()
    consumer && (await consumer.disconnect())
  })

  describe('getTopicMetadata', () => {
    test('throws an error if the topic name is not a valid string', async () => {
      admin = createAdmin({ cluster: createCluster(), logger: newLogger() })
      await expect(admin.getTopicMetadata(null)).rejects.toHaveProperty(
        'message',
        'Invalid topic null'
      )
    })

    test('retrieves metadata for each partition in the topic', async () => {
      const cluster = createCluster()
      admin = createAdmin({ cluster, logger: newLogger() })

      await admin.connect()
      const topicMetadata = await admin.getTopicMetadata(existingTopicName)

      expect(topicMetadata).toHaveProperty('name', existingTopicName)
      expect(topicMetadata.partitions).toHaveLength(numPartitions)

      topicMetadata.partitions.forEach(partition => {
        expect(partition).toHaveProperty('partitionId')
        expect(partition).toHaveProperty('leader')
        expect(partition).toHaveProperty('replicas')
        expect(partition).toHaveProperty('partitionErrorCode')
        expect(partition).toHaveProperty('isr')
      })
    })

    test('creates a new topic if the topic does not exist and "allowAutoTopicCreation" is true', async () => {
      admin = createAdmin({
        cluster: createCluster({ allowAutoTopicCreation: true }),
        logger: newLogger(),
      })
      const newTopicName = `test-topic-${secureRandom()}`

      await admin.connect()
      const topicMetadata = await admin.getTopicMetadata(newTopicName)

      expect(topicMetadata).toHaveProperty('name', newTopicName)
      expect(topicMetadata.partitions).toHaveLength(1)
    })

    test('throws an error if the topic does not exist and "allowAutoTopicCreation" is false', async () => {
      admin = createAdmin({
        cluster: createCluster({ allowAutoTopicCreation: false }),
        logger: newLogger(),
      })
      const newTopicName = `test-topic-${secureRandom()}`

      await admin.connect()
      await expect(admin.getTopicMetadata(newTopicName)).rejects.toHaveProperty(
        'message',
        'This server does not host this topic-partition'
      )
    })
  })
})
