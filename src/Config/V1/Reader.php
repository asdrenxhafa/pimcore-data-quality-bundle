<?php

namespace Valantic\DataQualityBundle\Config\V1;

use Pimcore\Model\DataObject\Concrete;
use Symfony\Component\EventDispatcher\EventDispatcher;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\Yaml\Exception\ExceptionInterface as YamlException;
use Symfony\Component\Yaml\Yaml;
use Valantic\DataQualityBundle\Exception\InvalidConfigEvent;

class Reader extends Config
{
    /**
     * @var EventDispatcher
     */
    protected $eventDispatcher;

    /**
     * Read and write the bundle's configuration.
     *
     * @param EventDispatcherInterface $eventDispatcher
     */
    public function __construct(EventDispatcherInterface $eventDispatcher)
    {
        $this->eventDispatcher = $eventDispatcher;
    }

    /**
     * Returns the raw config as read from disk.
     *
     * @return array
     * @internal
     */
    public function getRaw(): array
    {
        try {
            $parsed = Yaml::parseFile($this->getConfigFilePath());
        } catch (YamlException $exception) {
            $this->eventDispatcher->dispatch(new InvalidConfigEvent());

            return [];
        }

        if (!is_array($parsed)) {
            $this->eventDispatcher->dispatch(new InvalidConfigEvent());

            return [];
        }

        /**
         * @var $parsed array
         */
        return $parsed;
    }

    /**
     * Given $obj, return the corresponding config.
     *
     * @param Concrete $obj
     * @return array
     */
    public function getForObject(Concrete $obj): array
    {
        return $this->getForClass($obj->getClassName());
    }

    /**
     * @param Concrete $obj
     * @param string $attribute
     * @return array Given $obj, return the corresponding config for $attribute;
     */
    public function getForObjectAttribute(Concrete $obj, string $attribute): array
    {
        return $this->getForClassAttribute($obj->getClassName(), $attribute);
    }

    /**
     * Get the list of classes than can be validated i.e. are configured.
     *
     * @return array
     */
    public function getConfiguredClasses(): array
    {
        return array_keys($this->getRaw());
    }

    /**
     * Get the list of attributes of a class than can be validated i.e. are configured.
     *
     * @param string $classname
     *
     * @return array
     */
    public function getConfiguredClassAttributes(string $classname): array
    {
        return array_keys($this->getForClass($classname));
    }

    /**
     * Given a class name, return the corresponding config.
     *
     * @param string $className Base name or ::class
     * @return array
     */
    public function getForClass(string $className): array
    {
        if (strpos($className, '\\') !== false) {
            $nameParts = explode('\\', $className);
            $className = $nameParts[count($nameParts) - 1];
        }

        if (!in_array($className, $this->getConfiguredClasses(), true)) {
            return [];
        }

        return $this->safeArray($this->getRaw(), $className);
    }

    /**
     * Given a class name, return the corresponding config for $attribute.
     *
     * @param string $className Base name or ::class
     * @param string $attribute
     * @return array
     */
    public function getForClassAttribute(string $className, string $attribute): array
    {
        $classConfig = $this->getForClass($className);

        return $this->safeArray($classConfig, $attribute);
    }
}
